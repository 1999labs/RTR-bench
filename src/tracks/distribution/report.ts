import fs from "node:fs";
import path from "node:path";
import { loadDistributionData, groupKey, digest } from "../../shared/dataset.ts";
import { QUADRANTS, DISTRIBUTION_VERSION, FAILURE_ERROR, observed, distributionError, scoreFromError, constantBaseline, uniform, winnerCredit, meanCI, parsePrediction } from "../../shared/distribution.ts";
import { readJson, writeJson } from "../../shared/run-records.ts";
import type { Manifest, Record } from "./run.ts";

const mean = (values: number[]) => values.reduce((a,b)=>a+b,0)/values.length;
export const escapeHtml = (s: unknown) => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));

export function buildDistributionReport(dir: string) {
  const manifest = readJson<Manifest>(path.join(dir,"manifest.json"));
  const data = loadDistributionData(), config = manifest.config;
  if (manifest.id !== digest(JSON.stringify(config))) throw new Error("Manifest identity mismatch");
  if (config.datasetHash !== data.datasetHash || config.splitHash !== data.splitHash || config.scoringVersion !== DISTRIBUTION_VERSION) throw new Error("Report dataset, split, or scorer version mismatch");
  if (!config.targets.length || new Set(config.targets).size !== config.targets.length || config.targets.some(day=>!data.split[config.partition].includes(day)) || JSON.stringify(config.reference)!==JSON.stringify(data.split.reference)) throw new Error("Invalid manifest target or reference set");
  const reference = data.windows.filter(w=>config.reference.includes(w.day));
  const constant = constantBaseline(reference);
  const rows = config.targets.map(day=>{
    const w = data.windows.find(w=>w.day===day)!;
    const file = path.join(dir,"records",`${day}.json`);
    const rec = fs.existsSync(file) ? readJson<Record>(file) : null;
    if (rec && rec.day !== day) throw new Error(`Record day mismatch: ${day}`);
    const last = rec?.attempts.at(-1);
    // Reparse raw output, rather than trusting a cached parsed prediction.
    const validation = rec?.terminal && last?.status === "response" ? parsePrediction(last.raw) : null;
    const p = validation?.prediction ?? null, y = observed(w);
    const status = p ? "valid" : !rec?.terminal ? "pending" : last?.status === "response" && last.raw.trim() ? "invalid" : "missing";
    return {
      day, word:w.word, n:w.n, group:data.split.grouping.aliases[groupKey(w.word)] ?? groupKey(w.word),
      counts:w.counts, observed:y, prediction:p, originalSum:validation?.originalSum ?? null, status,
      failure:p ? null : validation?.error ?? rec?.validation?.error ?? "No terminal response",
      error:p ? distributionError(p,y) : FAILURE_ERROR, errorKind:p ? "measured" : "failure penalty",
      score:p ? scoreFromError(distributionError(p,y)) : 0,
      winnerCredit:p ? winnerCredit(p,w) : 0,
      uniformError:distributionError(uniform(),y), constantError:distributionError(constant,y),
      request:rec?.request ?? null, attempts:rec?.attempts ?? [],
    };
  });
  const complete = manifest.status === "complete" && rows.every(r=>r.status!=="pending");
  const errors = rows.map(r=>r.error), groups = rows.map(r=>r.group);
  const valid = rows.filter(r=>r.status==="valid");
  const attempts = rows.flatMap(r=>r.attempts);
  const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value>=0 ? value : null;
  const costs = attempts.map(a=>number(a.usage?.cost ?? a.usage?.total_cost));
  const tokens = attempts.map(a=>number(a.usage?.total_tokens));
  const providers: {[name:string]:number} = {};
  for (const a of attempts) if (a.provider) providers[a.provider]=(providers[a.provider]??0)+1;
  const summary = {
    complete, scope:config.targets.length===data.split[config.partition].length ? "full partition" : "limited pilot",
    total:rows.length, valid:valid.length, invalid:rows.filter(r=>r.status==="invalid").length,
    missing:rows.filter(r=>r.status==="missing").length, pending:rows.filter(r=>r.status==="pending").length,
    invalidOutputRate:rows.filter(r=>r.status==="invalid").length/rows.length,
    failureRate:complete ? (rows.length-valid.length)/rows.length : null,
    score:complete ? scoreFromError(mean(errors)) : null,
    meanError:complete ? mean(errors) : null,
    scoreCI:complete ? meanCI(rows.map(r=>r.score),groups) : null,
    validResponseMeanError:valid.length ? mean(valid.map(r=>r.error)) : null,
    winningQuadrantAccuracy:complete ? mean(rows.map(r=>r.winnerCredit)) : null,
    uniformScore:scoreFromError(mean(rows.map(r=>r.uniformError))),
    constantScore:scoreFromError(mean(rows.map(r=>r.constantError))), constantPrediction:constant,
    gainOverUniform:complete ? 50*mean(rows.map(r=>r.uniformError-r.error)) : null,
    gainOverConstant:complete ? 50*mean(rows.map(r=>r.constantError-r.error)) : null,
    gainOverUniformCI:complete ? meanCI(rows.map(r=>50*(r.uniformError-r.error)),groups) : null,
    gainOverConstantCI:complete ? meanCI(rows.map(r=>50*(r.constantError-r.error)),groups) : null,
    attempts:attempts.length, apiCalls:config.mode==="api" ? attempts.length : 0,
    knownTokens:tokens.reduce<number>((s,n)=>s+(n??0),0), unknownTokenAttempts:tokens.filter(n=>n===null).length,
    knownCostUsd:costs.reduce<number>((s,n)=>s+(n??0),0), unknownCostAttempts:costs.filter(n=>n===null).length,
    providers,
  };
  return {manifest,summary,rows};
}
export type Report = ReturnType<typeof buildDistributionReport>;
const fmt = (n: number | null) => n===null ? "not available" : n.toFixed(3);
const interval = (ci: [number,number] | null) => ci ? `${fmt(ci[0])}–${fmt(ci[1])}` : "not available";

export function distributionMarkdown(report: Report) {
  const {manifest:{config},summary:s} = report;
  return `# Distribution prediction\n\n${config.mode==="fixture" ? "**SYNTHETIC FIXTURE — not model performance.**" : `Model: ${config.model}`}\n\nPartition: ${config.partition}; ${s.scope}; ${s.complete ? "complete" : "INCOMPLETE — no headline score"}.\n\n| Measure | Value |\n|---|---:|\n| Score / 100 | ${fmt(s.score)} |\n| Score 95% interval | ${interval(s.scoreCI)} |\n| Mean error, including failures | ${fmt(s.meanError)} |\n| Valid-response mean error | ${fmt(s.validResponseMeanError)} |\n| Uniform baseline / 100 | ${fmt(s.uniformScore)} |\n| Constant reference baseline / 100 | ${fmt(s.constantScore)} |\n| Gain over uniform, points | ${fmt(s.gainOverUniform)} |\n| Gain over constant, points | ${fmt(s.gainOverConstant)} |\n| Paired gain over constant 95% interval | ${interval(s.gainOverConstantCI)} |\n| Winning-quadrant accuracy | ${s.winningQuadrantAccuracy===null ? "not available" : fmt(100*s.winningQuadrantAccuracy)+"%"} |\n| Valid / invalid / missing / pending | ${s.valid} / ${s.invalid} / ${s.missing} / ${s.pending} |\n| API calls | ${s.apiCalls} |\n| Known tokens / attempts with unknown tokens | ${s.knownTokens} / ${s.unknownTokenAttempts} |\n| Known cost USD / attempts with unknown cost | ${s.knownCostUsd.toFixed(6)} / ${s.unknownCostAttempts} |\n\nScore is 100 × (1 − mean error / 2), not percentage accuracy. Failures receive error 2. Every window has equal weight. Intervals use 2,000 entity-group bootstrap samples, seed 7, and describe variation across these targets, not uncertainty about unique people in the audience. Small pilot intervals are exploratory.\n\nSee [report.html](report.html) for predictions, counts, requests, and raw responses; [report.json](report.json) for complete metrics; [manifest.json](manifest.json) for the frozen configuration.\n`;
}

export function distributionHtml(report: Report) {
  const {summary:s,manifest:{config}} = report;
  const share = (n: number) => `${(n*100).toFixed(1)}%`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Distribution prediction</title>
<style>body{font:16px system-ui;max-width:1100px;margin:40px auto;padding:0 20px;color:#20242b;background:#f7f8fa}h1{margin-bottom:8px}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{text-align:left;padding:9px;border-bottom:1px solid #d9dee5}article{background:white;padding:20px;margin:20px 0;border:1px solid #d9dee5;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}input{padding:10px;width:90%;max-width:500px}summary{cursor:pointer} .badge{font-weight:bold;color:#843600} small{color:#515b68}</style>
<h1>Distribution prediction</h1><p class="badge">${config.mode==="fixture" ? "SYNTHETIC FIXTURE — not model performance" : escapeHtml(config.model)}</p>
<p>${escapeHtml(config.partition)} · ${escapeHtml(s.scope)} · ${s.complete ? "Complete" : "Incomplete — no headline score"}</p>
<table><tr><th>Score / 100</th><th>Uniform</th><th>Constant reference</th><th>Gain over constant</th></tr><tr><td>${fmt(s.score)}</td><td>${fmt(s.uniformScore)}</td><td>${fmt(s.constantScore)}</td><td>${fmt(s.gainOverConstant)} points</td></tr></table>
<p>95% score interval: ${interval(s.scoreCI)}. Paired gain interval: ${interval(s.gainOverConstantCI)}. Valid ${s.valid}; invalid ${s.invalid}; missing ${s.missing}; pending ${s.pending}.</p>
<p><small>Score is transformed squared error, not accuracy. All declared windows have equal weight; failures receive zero points. Intervals resample entity groups (2,000 samples, seed 7). Counts describe recorded submissions, not unique people. This is exploratory evaluation on a public dataset.</small></p>
<label>Filter prompts <input id="filter" type="search" placeholder="Search prompt or day"></label>
${report.rows.map(r=>`<article data-search="${escapeHtml(`${r.day} ${r.word}`.toLowerCase())}"><h2>Day ${r.day}: ${escapeHtml(r.word)}</h2><p>${r.n} submissions · ${escapeHtml(r.status)} · ${fmt(r.score)} / 100 · error ${fmt(r.error)} (${r.errorKind})</p>${r.failure ? `<p>${escapeHtml(r.failure)}</p>` : ""}<table><tr><th>Quadrant</th><th>Prediction</th><th>Observed</th></tr>${QUADRANTS.map(q=>`<tr><td>${q}</td><td>${r.prediction ? share(r.prediction[q]) : "—"}</td><td>${share(r.observed[q])}</td></tr>`).join("")}</table><details><summary>Inspect request and all attempts</summary><pre>${escapeHtml(JSON.stringify({request:r.request,attempts:r.attempts},null,2))}</pre></details></article>`).join("\n")}
<script>document.getElementById('filter').addEventListener('input',function(){const q=this.value.toLowerCase();document.querySelectorAll('article').forEach(el=>{el.hidden=!el.dataset.search.includes(q)})});</script></html>`;
}

export function writeDistributionReport(dir: string) {
  const report = buildDistributionReport(dir);
  writeJson(path.join(dir,"report.json"),report);
  fs.writeFileSync(path.join(dir,"report.md"),distributionMarkdown(report));
  fs.writeFileSync(path.join(dir,"report.html"),distributionHtml(report));
  return report;
}
