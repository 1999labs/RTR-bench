import fs from "node:fs";
import path from "node:path";
import { digest, loadDistributionData, type Partition } from "../../shared/dataset.ts";
import { DISTRIBUTION_VERSION, SUM_TOLERANCE, parsePrediction, type Validation } from "../../shared/distribution.ts";
import { MAX_ATTEMPTS, TIMEOUT_MS, API_URL, requestCompletion, type Attempt, type Request } from "../../shared/model-client.ts";
import { writeJson, readJson } from "../../shared/run-records.ts";
import { buildDistributionMessages, PROMPT_VERSION, PROMPT_HASH, SYSTEM, INSTRUCTIONS } from "./prompt.ts";
import { writeDistributionReport } from "./report.ts";

export type RunConfig = {
  track: "distribution"; runnerVersion: string; scoringVersion: string;
  datasetHash: string; splitHash: string; splitVersion: string; partition: Partition;
  targets: number[]; reference: number[]; model: string; provider: string | null;
  mode: "fixture" | "api"; fixtureHash: string | null;
  promptVersion: string; promptHash: string; instructions: { system: string; user: string };
  settings: { temperature: number; maxTokens: number; maxAttempts: number; timeoutMs: number; sumTolerance: number; apiUrl: string };
};
export type Manifest = { id: string; createdAt: string; config: RunConfig; status: "incomplete" | "complete"; completedAt?: string };
export type Record = { day: number; word: string; request: Request; attempts: Attempt[]; terminal: boolean; validation: Validation | null };
export type Options = { model?: string; provider?: string; partition?: Partition; limit?: number; fixture?: string; output?: string };

export async function runDistribution(options: Options, client = requestCompletion) {
  const data = loadDistributionData();
  const partition = options.partition ?? "development";
  if (!["development","evaluation"].includes(partition)) throw new Error("--split must be development or evaluation");
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1)) throw new Error("--limit must be a positive integer");
  const targets = data.split[partition].slice(0, options.limit);
  const fixtureRaw = options.fixture ? fs.readFileSync(options.fixture,"utf8") : null;
  const fixture = fixtureRaw === null ? null : JSON.parse(fixtureRaw);
  if (fixture !== null && (!fixture || typeof fixture !== "object" || Array.isArray(fixture) || targets.some(day => typeof fixture[day] !== "string"))) throw new Error("Fixture must map every selected target day to a raw response string");
  if (fixture !== null && options.provider) throw new Error("Fixture runs cannot specify a serving provider");
  const model = fixture !== null ? "fixture/synthetic" : options.model;
  if (!model) throw new Error("Usage: rtr-bench distribution <model> [--split development] [--limit 5] or --fixture <file>");
  const config: RunConfig = {
    track:"distribution", runnerVersion:"distribution-runner-v1", scoringVersion:DISTRIBUTION_VERSION,
    datasetHash:data.datasetHash, splitHash:data.splitHash, splitVersion:data.split.version, partition,
    targets, reference:data.split.reference, model, provider:options.provider ?? null,
    mode:fixture !== null ? "fixture" : "api", fixtureHash:fixtureRaw === null ? null : digest(fixtureRaw),
    promptVersion:PROMPT_VERSION, promptHash:PROMPT_HASH, instructions:{system:SYSTEM,user:INSTRUCTIONS},
    settings:{temperature:0,maxTokens:2000,maxAttempts:MAX_ATTEMPTS,timeoutMs:TIMEOUT_MS,sumTolerance:SUM_TOLERANCE,apiUrl:API_URL},
  };
  const id = digest(JSON.stringify(config));
  const root = options.output ?? path.join("results","distribution");
  const dir = path.join(root, `${model.replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}-${id.slice(0,16)}`);
  fs.mkdirSync(dir,{recursive:true});
  // An exclusive lock prevents two processes from spending on the same run.
  const lock = path.join(dir,"run.lock");
  let fd: number;
  try { fd = fs.openSync(lock,"wx"); }
  catch { throw new Error(`Run is locked: ${lock}. If its process is no longer running, remove the stale lock and resume.`); }
  fs.writeFileSync(fd, `${process.pid}\n`);
  try {
    const manifestPath = path.join(dir,"manifest.json");
    const manifest: Manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {id,createdAt:new Date().toISOString(),config,status:"incomplete"};
    if (manifest.id !== id || JSON.stringify(manifest.config) !== JSON.stringify(config)) throw new Error("Run manifest mismatch");
    writeJson(manifestPath,manifest);
    for (const day of targets) {
      const w = data.windows.find(w=>w.day===day)!;
      const file = path.join(dir,"records",`${day}.json`);
      const request: Request = {model,messages:buildDistributionMessages(w.word),temperature:config.settings.temperature,max_tokens:config.settings.maxTokens,usage:{include:true}};
      if (options.provider) request.provider = {order:[options.provider],allow_fallbacks:false};
      const rec: Record = fs.existsSync(file) ? readJson(file) : {day,word:w.word,request,attempts:[],terminal:false,validation:null};
      if (rec.day !== day || JSON.stringify(rec.request) !== JSON.stringify(request)) throw new Error(`Saved request mismatch for day ${day}`);
      if (rec.terminal) continue;
      const last = rec.attempts.at(-1);
      // Recover a response saved just before interruption without another call.
      if (last?.status === "response" || (last?.status === "error" && !last.retriable)) {
        rec.validation = last.status === "response" ? parsePrediction(last.raw) : {prediction:null,error:last.error,originalSum:null};
        rec.terminal = true;
      }
      while (!rec.terminal && rec.attempts.length < MAX_ATTEMPTS) {
        if (fixture === null && !process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
        const index = rec.attempts.length;
        if (index && fixture === null) await new Promise(resolve=>setTimeout(resolve,1000*2**(index-1)));
        const attempt: Attempt = {index:index+1,startedAt:new Date().toISOString(),status:"started",raw:"",response:null,provider:null,usage:null,error:null,retriable:true};
        rec.attempts.push(attempt);
        writeJson(file,rec);
        if (fixture !== null) Object.assign(attempt,{status:"response",finishedAt:new Date().toISOString(),raw:fixture[day],response:{fixture:true,content:fixture[day]},usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0,cost:0},retriable:false});
        else Object.assign(attempt,await client(request,process.env.OPENROUTER_API_KEY!));
        writeJson(file,rec);
        if (attempt.status === "response" || !attempt.retriable) {
          rec.validation = attempt.status === "response" ? parsePrediction(attempt.raw) : {prediction:null,error:attempt.error,originalSum:null};
          rec.terminal = true;
        }
      }
      if (!rec.terminal) {
        rec.validation = {prediction:null,error:rec.attempts.at(-1)?.error ?? "Attempt limit exhausted after interruption",originalSum:null};
        rec.terminal = true;
      }
      writeJson(file,rec);
      console.log(`distribution: day ${day} ${rec.validation?.prediction ? "valid" : "failed"}`);
    }
    manifest.status = "complete";
    manifest.completedAt ??= new Date().toISOString();
    writeJson(manifestPath,manifest);
    const report = writeDistributionReport(dir);
    return {dir,report};
  } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}
