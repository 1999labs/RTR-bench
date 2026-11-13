import fs from "node:fs";
import path from "node:path";
import { digest, loadDistributionData, type Partition } from "../../shared/dataset.ts";
import { DISTRIBUTION_VERSION } from "../../shared/distribution.ts";
import { readJson, writeJson } from "../../shared/run-records.ts";
import { requestCompletion, retryDelayMs, MAX_ATTEMPTS, TIMEOUT_MS, API_URL, type Attempt, type Request } from "../../shared/model-client.ts";
import { PROMPT_HASH } from "../distribution/prompt.ts";
import { createEpisode, ENVIRONMENT_VERSION, MAX_ACTIONS, type TraceEntry, type Outcome } from "./environment.ts";
import { prepareStrategy, STRATEGY_VERSION, SIMILARITY_VERSION, EVIDENCE_INSTRUCTION, type Strategy } from "./strategies.ts";
import { AGENT_VERSION, AGENT_PROMPT_HASH, agentMessages, agentRequest, callFinished, applyAgentCall, enforceAgentLimit, restoreAgent, type AgentCall } from "./agent.ts";
import { writeLearnRoomReport } from "./report.ts";
import { discoverSpendingPolicy, openSpendingLedger, spendingProvider, SpendingLimitError, type SpendingPolicy } from "../../shared/spending.ts";

export type RoomConfig = {
  track: "learn-room"; version: string; scorerVersion: string; environmentVersion: string;
  strategyVersion: string; promptHash: string; evidenceInstruction: string;
  datasetHash: string; splitHash: string; partition: Partition; targets: number[]; reference: number[];
  strategies: Strategy[]; budget: number; maxActions: number; seed: number;
  similarityVersion?:string; agentVersion?:string; agentPromptHash?:string; maxModelCalls?:number;
  spending?:SpendingPolicy;
  model: string; provider: string | null; mode: "fixture" | "api"; fixtureHash: string | null;
  settings: {temperature:number;maxTokens:number;maxAttempts:number;timeoutMs:number;apiUrl:string;retryPolicy?:string};
};
export type RoomManifest = {id:string;createdAt:string;config:RoomConfig;status:"incomplete"|"complete";completedAt?:string};
export type EpisodeRecord = {day:number;strategy:Strategy;request:Request;attempts:Attempt[];agentCalls?:AgentCall[];terminal:boolean;trace:TraceEntry[];outcome:Outcome|null};
type Options = {model?:string;provider?:string;partition?:Partition;limit?:number;strategy?:Strategy|"both"|"all";budget?:number;seed?:number;maxModelCalls?:number;fixture?:string;output?:string;maxUsd?:number;spending?:SpendingPolicy};

export function prepareEpisode(config: RoomConfig, strategy: Strategy, day: number, data = loadDistributionData()) {
  const target = data.windows.find(w=>w.day===day);
  if (!target || !config.targets.includes(day) || !config.strategies.includes(strategy)) throw new Error("Episode is outside the declared run");
  const reference = data.windows.filter(w=>config.reference.includes(w.day));
  const episode = createEpisode(target,reference,{budget:strategy==="none" ? 0 : config.budget,maxActions:config.maxActions,aliases:data.split.grouping.aliases});
  const messages = strategy==="agent" ? agentMessages(episode,config) : prepareStrategy(episode.agent,strategy,config.seed);
  const request: Request = {model:config.model,messages,temperature:config.settings.temperature,max_tokens:config.settings.maxTokens,usage:{include:true}};
  if (config.provider) request.provider={order:[config.provider],allow_fallbacks:false};
  if (config.spending) request.provider=spendingProvider(config.spending);
  return {episode,request};
}

export function finishEpisode(episode: ReturnType<typeof createEpisode>, attempts: Attempt[]) {
  const last = attempts.at(-1);
  if (last?.status!=="response" || !last.raw.trim()) episode.evaluator.abort(last?.error ?? "Missing final model response");
  else {
    let prediction: unknown = null;
    try { prediction=JSON.parse(last.raw); } catch { /* Invalid JSON is a final invalid prediction. */ }
    episode.agent.act({type:"submit_prediction",prediction});
  }
  return {trace:episode.evaluator.trace(),outcome:episode.evaluator.outcome()!};
}

export async function runLearnRoom(options: Options, client = requestCompletion) {
  const data=loadDistributionData(), partition=options.partition??"development", strategy=options.strategy??"both";
  if (!["development","evaluation"].includes(partition)) throw new Error("--split must be development or evaluation");
  if (!["none","random","similar","agent","both","all"].includes(strategy)) throw new Error("--strategy must be none, random, similar, agent, both, or all");
  const budget=options.budget??3, seed=options.seed??7;
  if (!Number.isInteger(budget)||budget<0||budget>3) throw new Error("--budget must be an integer from 0 to 3");
  if (!Number.isInteger(seed)||seed<0||seed>0xffffffff) throw new Error("--seed must be an unsigned 32-bit integer");
  const maxModelCalls=options.maxModelCalls??8;
  if (!Number.isInteger(maxModelCalls)||maxModelCalls<1||maxModelCalls>8) throw new Error("--max-model-calls must be an integer from 1 to 8");
  if (options.limit!==undefined && (!Number.isInteger(options.limit)||options.limit<1)) throw new Error("--limit must be a positive integer");
  const targets=data.split[partition].slice(0,options.limit), strategies: Strategy[]=strategy==="all" ? ["none","random","similar","agent"] : strategy==="both" ? ["none","random"] : [strategy];
  const fixtureRaw=options.fixture ? fs.readFileSync(options.fixture,"utf8") : null;
  const fixture=fixtureRaw===null ? null : JSON.parse(fixtureRaw);
  if (fixtureRaw!==null && (!fixture || typeof fixture!=="object" || Array.isArray(fixture) || strategies.some(s=>targets.some(day=>s==="agent" ? !Array.isArray(fixture[s]?.[day])||!fixture[s][day].length||fixture[s][day].some((v:unknown)=>typeof v!=="string") : typeof fixture[s]?.[day]!=="string")))) throw new Error("Fixture must map each strategy/day to a raw response string (agent: a nonempty array of raw action strings)");
  if (fixture && options.provider) throw new Error("Fixture runs cannot specify a provider");
  const model=fixture ? "fixture/synthetic" : options.model;
  if (!model) throw new Error("Specify a model or --fixture <file>");
  if(fixture&&(options.maxUsd!==undefined||options.spending)) throw new Error("Fixture runs do not need a spending policy");
  const spending=options.spending??(options.maxUsd!==undefined?await discoverSpendingPolicy(model,options.provider??"",options.maxUsd):undefined);
  const config: RoomConfig={track:"learn-room",version:"learn-room-runner-v2",scorerVersion:DISTRIBUTION_VERSION,environmentVersion:ENVIRONMENT_VERSION,strategyVersion:STRATEGY_VERSION,similarityVersion:SIMILARITY_VERSION,agentVersion:AGENT_VERSION,agentPromptHash:AGENT_PROMPT_HASH,maxModelCalls,promptHash:PROMPT_HASH,evidenceInstruction:EVIDENCE_INSTRUCTION,datasetHash:data.datasetHash,splitHash:data.splitHash,partition,targets,reference:data.split.reference,strategies,budget,maxActions:MAX_ACTIONS,seed,model,provider:options.provider??null,mode:fixture?"fixture":"api",fixtureHash:fixtureRaw===null?null:digest(fixtureRaw),settings:{temperature:0,maxTokens:2000,maxAttempts:MAX_ATTEMPTS,timeoutMs:TIMEOUT_MS,apiUrl:API_URL}};
  if(spending) config.spending=spending;
  config.version="learn-room-runner-v3";
  config.settings.retryPolicy="retry-after-v1";
  const id=digest(JSON.stringify(config)), dir=path.join(options.output??path.join("results","learn-room"),`${model.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-${id.slice(0,16)}`);
  fs.mkdirSync(dir,{recursive:true});
  const lock=path.join(dir,"run.lock");
  let fd:number;
  try { fd=fs.openSync(lock,"wx"); } catch { throw new Error(`Run is locked: ${lock}. Remove a stale lock only after verifying its process has exited.`); }
  fs.writeFileSync(fd,`${process.pid}\n`);
  try {
    const manifestPath=path.join(dir,"manifest.json");
    const manifest:RoomManifest=fs.existsSync(manifestPath)?readJson(manifestPath):{id,createdAt:new Date().toISOString(),config,status:"incomplete"};
    if (manifest.id!==id || JSON.stringify(manifest.config)!==JSON.stringify(config)) throw new Error("Run manifest mismatch");
    writeJson(manifestPath,manifest);
    const ledger=spending?openSpendingLedger(path.join(dir,"spending.json"),spending):null;
    for (const s of strategies) for (const day of targets) {
      const {episode,request}=prepareEpisode(config,s,day,data);
      const file=path.join(dir,"episodes",s,`${day}.json`);
      const rec:EpisodeRecord=fs.existsSync(file)?readJson(file):{day,strategy:s,request,attempts:[],terminal:false,trace:episode.evaluator.trace(),outcome:null};
      if (rec.day!==day||rec.strategy!==s||JSON.stringify(rec.request)!==JSON.stringify(request)) throw new Error(`Episode request mismatch for ${s}/${day}`);
      if (rec.terminal) continue;
      if(s==="agent") {
        const messages=restoreAgent(episode,rec,config);
        rec.agentCalls??=[];
        while(!episode.evaluator.outcome()) {
          let call=rec.agentCalls.at(-1);
          if(!call||call.applied) {
            enforceAgentLimit(episode,rec.agentCalls,config);
            if(episode.evaluator.outcome()) break;
            call={request:agentRequest(config,messages),attempts:[],applied:false};
            rec.agentCalls.push(call);writeJson(file,rec);
          }
          while(!callFinished(call.attempts)) {
            if(!fixture&&!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
            if(call.attempts.length&&!fixture) await new Promise(resolve=>setTimeout(resolve,retryDelayMs(call.attempts.at(-1),call.attempts.length)));
            const reservation=ledger?.reserve(call.request);
            const attempt:Attempt={index:call.attempts.length+1,startedAt:new Date().toISOString(),status:"started",raw:"",response:null,provider:null,usage:null,error:null,retriable:true};
            call.attempts.push(attempt);rec.attempts=rec.agentCalls.flatMap(c=>c.attempts);writeJson(file,rec);
            if(fixture) {
              const raw=fixture[s][day][rec.agentCalls.length-1]??"";
              Object.assign(attempt,{status:"response",finishedAt:new Date().toISOString(),raw,response:{fixture:true,content:raw},usage:{total_tokens:0,cost:0},retriable:false});
            } else Object.assign(attempt,await client(call.request,process.env.OPENROUTER_API_KEY!));
            writeJson(file,rec);
            if(reservation!==undefined) ledger!.settle(reservation,attempt.usage,attempt);
          }
          applyAgentCall(episode,messages,call);call.applied=true;
          enforceAgentLimit(episode,rec.agentCalls,config);
          rec.trace=episode.evaluator.trace();rec.outcome=episode.evaluator.outcome();rec.terminal=!!rec.outcome;
          writeJson(file,rec);
        }
        console.log(`learn-room: agent day ${day} ${rec.outcome!.status}, ${rec.outcome!.inspections} inspections, ${rec.agentCalls.length} model turns`);
        continue;
      }
      let last=rec.attempts.at(-1);
      while (rec.attempts.length<MAX_ATTEMPTS && !(last && (last.status==="response" || (last.status==="error"&&!last.retriable)))) {
        if (!fixture&&!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
        if (rec.attempts.length && !fixture) await new Promise(resolve=>setTimeout(resolve,retryDelayMs(rec.attempts.at(-1),rec.attempts.length)));
        const reservation=ledger?.reserve(request);
        const attempt:Attempt={index:rec.attempts.length+1,startedAt:new Date().toISOString(),status:"started",raw:"",response:null,provider:null,usage:null,error:null,retriable:true};
        rec.attempts.push(attempt); writeJson(file,rec);
        if (fixture) Object.assign(attempt,{status:"response",finishedAt:new Date().toISOString(),raw:fixture[s][day],response:{fixture:true,content:fixture[s][day]},usage:{total_tokens:0,cost:0},retriable:false});
        else Object.assign(attempt,await client(request,process.env.OPENROUTER_API_KEY!));
        writeJson(file,rec); last=attempt;
        if(reservation!==undefined) ledger!.settle(reservation,attempt.usage,attempt);
      }
      Object.assign(rec,finishEpisode(episode,rec.attempts),{terminal:true}); writeJson(file,rec);
      console.log(`learn-room: ${s} day ${day} ${rec.outcome!.status}, ${rec.outcome!.inspections} inspections`);
    }
    manifest.status="complete";manifest.completedAt??=new Date().toISOString();writeJson(manifestPath,manifest);
    if(ledger) console.log(`Spending: ${JSON.stringify(ledger.summary())}`);
    return {dir,report:writeLearnRoomReport(dir)};
  } catch(error) {
    if(error instanceof SpendingLimitError) {writeLearnRoomReport(dir);console.error(`${error.message}. Incomplete report: ${dir}`);}
    throw error;
  } finally { fs.closeSync(fd);fs.unlinkSync(lock); }
}
