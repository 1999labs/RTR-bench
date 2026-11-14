import fs from "node:fs";
import path from "node:path";
import { digest, loadDistributionData, groupKey } from "../../shared/dataset.ts";
import { DISTRIBUTION_VERSION, observed, constantBaseline, uniform, distributionError, scoreFromError, meanCI, QUADRANTS } from "../../shared/distribution.ts";
import { readJson, writeJson } from "../../shared/run-records.ts";
import { escapeHtml } from "../distribution/report.ts";
import { ENVIRONMENT_VERSION } from "./environment.ts";
import { STRATEGY_VERSION, SIMILARITY_VERSION } from "./strategies.ts";
import { AGENT_VERSION, getAgentPolicy, restoreAgent } from "./agent.ts";
import { prepareEpisode, finishEpisode, type RoomManifest, type EpisodeRecord } from "./run.ts";

const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
const fmt=(n:number|null)=>n===null?"not available":n.toFixed(3);
export function buildLearnRoomReport(dir:string) {
  const manifest=readJson<RoomManifest>(path.join(dir,"manifest.json")), c=manifest.config, data=loadDistributionData();
  if (manifest.id!==digest(JSON.stringify(c))||c.datasetHash!==data.datasetHash||c.splitHash!==data.splitHash||c.scorerVersion!==DISTRIBUTION_VERSION||c.environmentVersion!==ENVIRONMENT_VERSION||!["learn-room-strategies-v1",STRATEGY_VERSION].includes(c.strategyVersion)) throw new Error("Manifest or protocol fingerprint mismatch");
  if(c.strategies.includes("similar")&&c.similarityVersion!==SIMILARITY_VERSION) throw new Error("Similarity version mismatch");
  if(c.agentPolicy!==undefined&&!c.strategies.includes("agent")) throw new Error("Agent policy requires an agent strategy");
  if(c.strategies.includes("agent")&&(c.agentVersion!==AGENT_VERSION||c.agentPromptHash!==getAgentPolicy(c.agentPolicy).promptHash||!Number.isInteger(c.maxModelCalls)||c.maxModelCalls!<1||c.maxModelCalls!>8)) throw new Error("Agent protocol mismatch");
  if (!["development","evaluation"].includes(c.partition)||!c.targets.length||new Set(c.targets).size!==c.targets.length||c.targets.some(d=>!data.split[c.partition].includes(d))||JSON.stringify(c.reference)!==JSON.stringify(data.split.reference)||!c.strategies.length||new Set(c.strategies).size!==c.strategies.length||c.strategies.some(s=>!["none","random","similar","agent"].includes(s))) throw new Error("Invalid targets, reference pool, or strategies");
  const rows=c.strategies.flatMap(strategy=>c.targets.map(day=>{
    const target=data.windows.find(w=>w.day===day)!;
    const file=path.join(dir,"episodes",strategy,`${day}.json`), rec=fs.existsSync(file)?readJson<EpisodeRecord>(file):null;
    const {episode,request}=prepareEpisode(c,strategy,day,data);
    if (rec && (rec.day!==day||rec.strategy!==strategy||JSON.stringify(rec.request)!==JSON.stringify(request))) throw new Error("Saved episode request mismatch");
    if(strategy==="agent"&&rec) restoreAgent(episode,rec,c);
    const replay=strategy==="agent" ? {trace:episode.evaluator.trace(),outcome:episode.evaluator.outcome()} : rec?.terminal?finishEpisode(episode,rec.attempts):{trace:rec?.trace??[],outcome:null};
    if (rec && !rec.terminal && JSON.stringify(rec.trace)!==JSON.stringify(episode.evaluator.trace())) throw new Error("Pending episode trace differs from replay");
    if (rec?.terminal && JSON.stringify(rec.trace)!==JSON.stringify(replay.trace)) throw new Error("Saved episode trace differs from replay");
    return {day,word:target.word,n:target.n,group:data.split.grouping.aliases[groupKey(target.word)]??groupKey(target.word),observed:observed(target),strategy,request,attempts:strategy==="agent" ? rec?.agentCalls?.flatMap(call=>call.attempts)??[] : rec?.attempts??[],agentCalls:rec?.agentCalls??[],...replay};
  }));
  const constant=constantBaseline(data.windows.filter(w=>c.reference.includes(w.day)));
  const targets=data.windows.filter(w=>c.targets.includes(w.day));
  const baselines={uniformScore:scoreFromError(mean(targets.map(w=>distributionError(uniform(),observed(w))))),constantScore:scoreFromError(mean(targets.map(w=>distributionError(constant,observed(w))))),constantPrediction:constant};
  const summaries=c.strategies.map(strategy=>{
    const selected=rows.filter(r=>r.strategy===strategy),complete=manifest.status==="complete"&&selected.every(r=>r.outcome);
    const outcomes=selected.flatMap(r=>r.outcome?[r.outcome]:[]),attempts=selected.flatMap(r=>r.attempts);
    const usage=(key:"cost"|"total_tokens")=>{
      const values=attempts.map(a=>key==="cost"?(a.usage?.cost??a.usage?.total_cost):a.usage?.total_tokens);
      const known=values.filter((x):x is number=>typeof x==="number"&&Number.isFinite(x)&&x>=0);
      return {known:known.reduce((a,b)=>a+b,0),unknownAttempts:values.length-known.length};
    };
    const valid=outcomes.filter(o=>o.status==="valid");
    return {strategy,complete,total:selected.length,valid:valid.length,invalid:outcomes.filter(o=>o.status==="invalid").length,missing:outcomes.filter(o=>o.status==="missing").length,pending:selected.length-outcomes.length,
      score:complete?mean(outcomes.map(o=>o.score)):null,meanError:complete?mean(outcomes.map(o=>o.error)):null,validResponseMeanError:valid.length?mean(valid.map(o=>o.error)):null,
      scoreCI:complete?meanCI(outcomes.map(o=>o.score),selected.map(r=>r.group)):null,winningQuadrantAccuracy:complete?mean(outcomes.map(o=>o.winnerCredit)):null,
      invalidOutputRate:outcomes.filter(o=>o.status==="invalid").length/selected.length,failureRate:complete?(selected.length-valid.length)/selected.length:null,
      inspections:selected.reduce((sum,r)=>sum+new Set(r.trace.filter(t=>(t.action as any)?.type==="inspect_example"&&(t.observation as any)?.ok).map(t=>(t.action as any).id)).size,0),actions:selected.reduce((sum,r)=>sum+r.trace.filter(t=>(t.action as any)?.type!=="evaluator_abort").length,0),attempts:attempts.length,apiCalls:c.mode==="api"?attempts.length:0,
      tokens:usage("total_tokens"),costUsd:usage("cost"),providers:Object.fromEntries([...new Set(attempts.flatMap(a=>a.provider?[a.provider]:[]))].map(p=>[p,attempts.filter(a=>a.provider===p).length])),
      modelCalls:selected.reduce((sum,r)=>sum+(strategy==="agent"?r.agentCalls.length:r.attempts.length?1:0),0),
      rejectedActions:selected.reduce((sum,r)=>sum+r.trace.filter(t=>(t.action as any)?.type!=="evaluator_abort"&&(t.observation as any)?.ok===false).length,0),
    };
  });
  const complete=summaries.every(s=>s.complete);
  const pairs=[["random","none"],["similar","none"],["agent","none"],["agent","random"],["agent","similar"]];
  const comparisons=complete?pairs.filter(([strategy,control])=>c.strategies.includes(strategy as any)&&c.strategies.includes(control as any)).map(([strategy,control])=>{
    const paired=c.targets.map(day=>{
      const before=rows.find(r=>r.strategy===control&&r.day===day)!,after=rows.find(r=>r.strategy===strategy&&r.day===day)!;
      return {day,group:before.group,scoreGain:after.outcome!.score-before.outcome!.score,errorReduction:before.outcome!.error-after.outcome!.error};
    });
    return {strategy,control,scoreGain:mean(paired.map(p=>p.scoreGain)),errorReduction:mean(paired.map(p=>p.errorReduction)),scoreGainCI:meanCI(paired.map(p=>p.scoreGain),paired.map(p=>p.group)),pairs:paired};
  }):[];
  const comparison=comparisons.find(p=>p.strategy==="random"&&p.control==="none")??null;
  return {manifest,complete,scope:c.targets.length===data.split[c.partition].length?"full partition":"limited pilot",baselines,summaries,comparison,comparisons,rows};
}
export type RoomReport=ReturnType<typeof buildLearnRoomReport>;
export function learnRoomMarkdown(r:RoomReport) {
  const heading=r.manifest.config.mode==="fixture"?"**SYNTHETIC FIXTURE — not model performance.**":`Model: ${r.manifest.config.model}`;
  const lines=["# Learn the Room","",heading,"",`${r.manifest.config.partition}; ${r.scope}; ${r.complete?"complete":"incomplete"}. Evidence budget: ${r.manifest.config.budget}; seed: ${r.manifest.config.seed}.${r.manifest.config.agentPolicy?` Agent policy: ${r.manifest.config.agentPolicy}.`:""}`,"",
    "| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |",
    "|---|---:|---|---:|---:|---:|---:|---:|---:|---:|",
    ...r.summaries.map(s=>`| ${s.strategy} | ${fmt(s.score)} | ${s.valid} / ${s.invalid} / ${s.missing} / ${s.pending} | ${s.inspections} | ${s.modelCalls} | ${s.apiCalls} | ${s.tokens.known} | ${s.tokens.unknownAttempts} | ${s.costUsd.known.toFixed(6)} | ${s.costUsd.unknownAttempts} |`),"",
    `Uniform baseline: ${fmt(r.baselines.uniformScore)} / 100. Constant reference baseline: ${fmt(r.baselines.constantScore)} / 100.`,"",
    "| Comparison | Gain (points) | Paired 95% interval |","|---|---:|---|",
    ...r.comparisons.map(p=>`| ${p.strategy} vs ${p.control} | ${fmt(p.scoreGain)} | ${p.scoreGainCI!.map(fmt).join(" to ")} |`),"",
    "Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.","",
    "[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)",""];
  return lines.join("\n");
}
export function learnRoomHtml(r:RoomReport) {
  const e=escapeHtml;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Learn the Room</title><style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 20px;background:#f7f8fa;color:#20242b}article{background:white;padding:20px;margin:20px 0;border:1px solid #ccd3dd;border-radius:8px}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:9px;border-bottom:1px solid #ddd}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}summary{cursor:pointer}input,select{padding:8px;margin:8px}.badge{color:#843600;font-weight:bold}</style>
<h1>Learn the Room</h1><p class="badge">${r.manifest.config.mode==="fixture"?"SYNTHETIC FIXTURE — not model performance":e(r.manifest.config.model)}</p><p>${e(r.manifest.config.partition)} · ${r.scope} · ${r.complete?"Complete":"Incomplete"} · Inspection budget ${r.manifest.config.budget} · Seed ${r.manifest.config.seed}${r.manifest.config.agentPolicy?` · Agent policy ${e(r.manifest.config.agentPolicy)}`:""}</p>
<table><tr><th>Strategy</th><th>Score / 100</th><th>95% interval</th><th>Inspections</th><th>Model turns</th><th>API calls</th><th>Known tokens</th><th>Unknown-token attempts</th><th>Known USD</th><th>Unknown-cost attempts</th></tr>${r.summaries.map(s=>`<tr><td>${s.strategy}</td><td>${fmt(s.score)}</td><td>${s.scoreCI?s.scoreCI.map(fmt).join("–"):"—"}</td><td>${s.inspections}</td><td>${s.modelCalls}</td><td>${s.apiCalls}</td><td>${s.tokens.known}</td><td>${s.tokens.unknownAttempts}</td><td>${s.costUsd.known.toFixed(6)}</td><td>${s.costUsd.unknownAttempts}</td></tr>`).join("")}</table><p>Uniform: ${fmt(r.baselines.uniformScore)}. Constant reference: ${fmt(r.baselines.constantScore)}.</p><table><tr><th>Comparison</th><th>Gain (points)</th><th>Paired 95% interval</th></tr>${r.comparisons.map(p=>`<tr><td>${p.strategy} vs ${p.control}</td><td>${fmt(p.scoreGain)}</td><td>${p.scoreGainCI!.map(fmt).join("–")}</td></tr>`).join("")}</table><p>Scores are transformed distribution errors, not percentage accuracy. Invalid and missing predictions earn zero points. Usage is reported separately. Five-target synthetic pilots demonstrate the pipeline only.</p>
<label>Prompt <input id="query" type="search"></label><label>Strategy <select id="strategy"><option value="">All</option>${r.manifest.config.strategies.map(s=>`<option>${s}</option>`).join("")}</select></label>
${r.rows.map(row=>`<article data-search="${e(`${row.day} ${row.word}`.toLowerCase())}" data-strategy="${row.strategy}"><h2>${row.day}: ${e(row.word)} · ${row.strategy}</h2><p>${row.n} submissions · ${row.outcome?`${row.outcome.status} · ${fmt(row.outcome.score)} / 100 · ${row.outcome.inspections} inspections`:"Pending"}</p>${row.outcome?.failure?`<p>${e(row.outcome.failure)}</p>`:""}<table><tr><th>Quadrant</th><th>Predicted share</th><th>Observed share</th></tr>${QUADRANTS.map(q=>`<tr><td>${q}</td><td>${row.outcome?.prediction?fmt(row.outcome.prediction[q]):"—"}</td><td>${fmt(row.observed[q])}</td></tr>`).join("")}</table><details><summary>Actions and observations</summary><pre>${e(JSON.stringify(row.trace,null,2))}</pre></details><details><summary>Model request and all attempts</summary><pre>${e(JSON.stringify({request:row.request,attempts:row.attempts,agentCalls:row.agentCalls},null,2))}</pre></details></article>`).join("\n")}
<script>function filter(){const q=document.getElementById('query').value.toLowerCase(),s=document.getElementById('strategy').value;document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.search.includes(q)||(s&&a.dataset.strategy!==s));}document.getElementById('query').addEventListener('input',filter);document.getElementById('strategy').addEventListener('change',filter);</script></html>`;
}
export function writeLearnRoomReport(dir:string) {
  const report=buildLearnRoomReport(dir);writeJson(path.join(dir,"report.json"),report);
  fs.writeFileSync(path.join(dir,"report.md"),learnRoomMarkdown(report));fs.writeFileSync(path.join(dir,"report.html"),learnRoomHtml(report));return report;
}
