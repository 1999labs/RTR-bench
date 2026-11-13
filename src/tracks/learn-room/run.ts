import fs from "node:fs";
import path from "node:path";
import { digest, loadDistributionData, type Partition } from "../../shared/dataset.ts";
import { DISTRIBUTION_VERSION } from "../../shared/distribution.ts";
import { readJson, writeJson } from "../../shared/run-records.ts";
import { requestCompletion, MAX_ATTEMPTS, TIMEOUT_MS, API_URL, type Attempt, type Request } from "../../shared/model-client.ts";
import { PROMPT_HASH } from "../distribution/prompt.ts";
import { createEpisode, ENVIRONMENT_VERSION, MAX_ACTIONS, type TraceEntry, type Outcome } from "./environment.ts";
import { prepareStrategy, STRATEGY_VERSION, EVIDENCE_INSTRUCTION, type Strategy } from "./strategies.ts";
import { writeLearnRoomReport } from "./report.ts";

export type RoomConfig = {
  track: "learn-room"; version: string; scorerVersion: string; environmentVersion: string;
  strategyVersion: string; promptHash: string; evidenceInstruction: string;
  datasetHash: string; splitHash: string; partition: Partition; targets: number[]; reference: number[];
  strategies: Strategy[]; budget: number; maxActions: number; seed: number;
  model: string; provider: string | null; mode: "fixture" | "api"; fixtureHash: string | null;
  settings: {temperature:number;maxTokens:number;maxAttempts:number;timeoutMs:number;apiUrl:string};
};
export type RoomManifest = {id:string;createdAt:string;config:RoomConfig;status:"incomplete"|"complete";completedAt?:string};
export type EpisodeRecord = {day:number;strategy:Strategy;request:Request;attempts:Attempt[];terminal:boolean;trace:TraceEntry[];outcome:Outcome|null};
type Options = {model?:string;provider?:string;partition?:Partition;limit?:number;strategy?:Strategy|"both";budget?:number;seed?:number;fixture?:string;output?:string};

export function prepareEpisode(config: RoomConfig, strategy: Strategy, day: number, data = loadDistributionData()) {
  const target = data.windows.find(w=>w.day===day);
  if (!target || !config.targets.includes(day) || !config.strategies.includes(strategy)) throw new Error("Episode is outside the declared run");
  const reference = data.windows.filter(w=>config.reference.includes(w.day));
  const episode = createEpisode(target,reference,{budget:strategy==="none" ? 0 : config.budget,maxActions:config.maxActions,aliases:data.split.grouping.aliases});
  const messages = prepareStrategy(episode.agent,strategy,config.seed);
  const request: Request = {model:config.model,messages,temperature:config.settings.temperature,max_tokens:config.settings.maxTokens,usage:{include:true}};
  if (config.provider) request.provider={order:[config.provider],allow_fallbacks:false};
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
  if (!["none","random","both"].includes(strategy)) throw new Error("--strategy must be none, random, or both");
  const budget=options.budget??3, seed=options.seed??7;
  if (!Number.isInteger(budget)||budget<0||budget>3) throw new Error("--budget must be an integer from 0 to 3");
  if (!Number.isInteger(seed)||seed<0||seed>0xffffffff) throw new Error("--seed must be an unsigned 32-bit integer");
  if (options.limit!==undefined && (!Number.isInteger(options.limit)||options.limit<1)) throw new Error("--limit must be a positive integer");
  const targets=data.split[partition].slice(0,options.limit), strategies: Strategy[]=strategy==="both" ? ["none","random"] : [strategy];
  const fixtureRaw=options.fixture ? fs.readFileSync(options.fixture,"utf8") : null;
  const fixture=fixtureRaw===null ? null : JSON.parse(fixtureRaw);
  if (fixtureRaw!==null && (!fixture || typeof fixture!=="object" || Array.isArray(fixture) || strategies.some(s=>targets.some(day=>typeof fixture[s]?.[day]!=="string")))) throw new Error("Fixture must map each strategy and selected target day to a raw response string");
  if (fixture && options.provider) throw new Error("Fixture runs cannot specify a provider");
  const model=fixture ? "fixture/synthetic" : options.model;
  if (!model) throw new Error("Specify a model or --fixture <file>");
  const config: RoomConfig={track:"learn-room",version:"learn-room-runner-v1",scorerVersion:DISTRIBUTION_VERSION,environmentVersion:ENVIRONMENT_VERSION,strategyVersion:STRATEGY_VERSION,promptHash:PROMPT_HASH,evidenceInstruction:EVIDENCE_INSTRUCTION,datasetHash:data.datasetHash,splitHash:data.splitHash,partition,targets,reference:data.split.reference,strategies,budget,maxActions:MAX_ACTIONS,seed,model,provider:options.provider??null,mode:fixture?"fixture":"api",fixtureHash:fixtureRaw===null?null:digest(fixtureRaw),settings:{temperature:0,maxTokens:2000,maxAttempts:MAX_ATTEMPTS,timeoutMs:TIMEOUT_MS,apiUrl:API_URL}};
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
    for (const s of strategies) for (const day of targets) {
      const {episode,request}=prepareEpisode(config,s,day,data);
      const file=path.join(dir,"episodes",s,`${day}.json`);
      const rec:EpisodeRecord=fs.existsSync(file)?readJson(file):{day,strategy:s,request,attempts:[],terminal:false,trace:episode.evaluator.trace(),outcome:null};
      if (rec.day!==day||rec.strategy!==s||JSON.stringify(rec.request)!==JSON.stringify(request)) throw new Error(`Episode request mismatch for ${s}/${day}`);
      if (rec.terminal) continue;
      let last=rec.attempts.at(-1);
      while (rec.attempts.length<MAX_ATTEMPTS && !(last && (last.status==="response" || (last.status==="error"&&!last.retriable)))) {
        if (!fixture&&!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
        if (rec.attempts.length && !fixture) await new Promise(resolve=>setTimeout(resolve,1000*2**(rec.attempts.length-1)));
        const attempt:Attempt={index:rec.attempts.length+1,startedAt:new Date().toISOString(),status:"started",raw:"",response:null,provider:null,usage:null,error:null,retriable:true};
        rec.attempts.push(attempt); writeJson(file,rec);
        if (fixture) Object.assign(attempt,{status:"response",finishedAt:new Date().toISOString(),raw:fixture[s][day],response:{fixture:true,content:fixture[s][day]},usage:{total_tokens:0,cost:0},retriable:false});
        else Object.assign(attempt,await client(request,process.env.OPENROUTER_API_KEY!));
        writeJson(file,rec); last=attempt;
      }
      Object.assign(rec,finishEpisode(episode,rec.attempts),{terminal:true}); writeJson(file,rec);
      console.log(`learn-room: ${s} day ${day} ${rec.outcome!.status}, ${rec.outcome!.inspections} inspections`);
    }
    manifest.status="complete";manifest.completedAt??=new Date().toISOString();writeJson(manifestPath,manifest);
    return {dir,report:writeLearnRoomReport(dir)};
  } finally { fs.closeSync(fd);fs.unlinkSync(lock); }
}
