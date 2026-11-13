#!/usr/bin/env node
// RTR-bench CLI
//
//   node src/cli.ts catalog --limit 20
//   node src/cli.ts run --models a,b --tasks both
//   node src/cli.ts score
//   node src/cli.ts report

import "./env.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadWindows } from "./score.ts";
import { runModel, listModels, listEndpoints } from "./run.ts";
import { writeReport, scoreLine, listRuns } from "./report.ts";
import { writeInterpretations } from "./interpretations.ts";
import { runDistribution } from "./tracks/distribution/run.ts";
import { writeDistributionReport } from "./tracks/distribution/report.ts";
import { runLearnRoom } from "./tracks/learn-room/run.ts";
import { writeLearnRoomReport } from "./tracks/learn-room/report.ts";

type Options = Record<string, string | boolean>;

function parse(args: string[]): Options {
  const out: Options = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = parse(rest);

if (cmd === "learn-room") {
  const allowed = new Set(["split", "limit", "provider", "fixture", "output", "strategy", "budget", "seed"]);
  for (const [key,value] of Object.entries(flags)) {
    if (!allowed.has(key)) throw new Error(`Unknown learn-room flag --${key}`);
    if (typeof value !== "string") throw new Error(`--${key} requires a value`);
  }
  const {dir,report} = await runLearnRoom({
    model: rest[0] && !rest[0].startsWith("--") ? rest[0] : undefined,
    partition: (flags.split ?? "development") as "development" | "evaluation",
    strategy: (flags.strategy ?? "both") as "none" | "random" | "both",
    limit: flags.limit === undefined ? undefined : Number(flags.limit),
    budget: flags.budget === undefined ? undefined : Number(flags.budget),
    seed: flags.seed === undefined ? undefined : Number(flags.seed),
    provider: flags.provider as string | undefined, fixture: flags.fixture as string | undefined,
    output: flags.output as string | undefined,
  });
  for (const summary of report.summaries) console.log(`${report.manifest.config.mode === "fixture" ? "SYNTHETIC FIXTURE: " : ""}learn-room ${summary.strategy}: ${summary.score?.toFixed(2)}/100`);
  console.log(`report: ${path.resolve(dir,"report.html")}`);
} else if (cmd === "learn-room-report") {
  if (!rest[0] || rest[0].startsWith("--")) throw new Error("usage: rtr-bench learn-room-report <run-directory>");
  const report = writeLearnRoomReport(rest[0]);
  console.log(`learn-room: ${report.complete ? "complete" : "incomplete"}`);
} else if (cmd === "distribution") {
  const allowed = new Set(["split", "limit", "provider", "fixture", "output"]);
  for (const [key,value] of Object.entries(flags)) {
    if (!allowed.has(key)) throw new Error(`Unknown distribution flag --${key}`);
    if (typeof value !== "string") throw new Error(`--${key} requires a value`);
  }
  const model = rest[0] && !rest[0].startsWith("--") ? rest[0] : undefined;
  const {dir,report} = await runDistribution({
    model, partition: (flags.split ?? "development") as "development" | "evaluation",
    limit: flags.limit === undefined ? undefined : Number(flags.limit),
    provider: flags.provider as string | undefined, fixture: flags.fixture as string | undefined,
    output: flags.output as string | undefined,
  });
  console.log(`${report.manifest.config.mode === "fixture" ? "SYNTHETIC FIXTURE: " : ""}distribution ${report.summary.score?.toFixed(2)}/100; report: ${path.resolve(dir,"report.html")}`);
} else if (cmd === "distribution-report") {
  if (!rest[0] || rest[0].startsWith("--")) throw new Error("usage: rtr-bench distribution-report <run-directory>");
  const report = writeDistributionReport(rest[0]);
  console.log(`distribution: ${report.summary.complete ? report.summary.score?.toFixed(2)+"/100" : "incomplete"}`);
} else if (cmd === "catalog") {
  const models = await listModels();
  const limit = Number(flags.limit ?? 20);
  const rows = models
    .filter((m: any) => Number(m.pricing?.prompt) >= 0)
    .filter((m: any) => (m.architecture?.input_modalities ?? []).includes("text"))
    .map((m: any) => ({
      id: m.id,
      ctx: m.context_length,
      inUsd: Number(m.pricing?.prompt) * 1e6,
      outUsd: Number(m.pricing?.completion) * 1e6,
      temp: (m.supported_parameters ?? []).includes("temperature"),
      score: m.benchmarks?.artificial_analysis?.intelligence_index ?? null,
    }))
    .sort((a: any, b: any) => a.inUsd - b.inUsd)
    .slice(0, limit);
  console.table(rows);
} else if (cmd === "run") {
  const models = String(flags.models ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (models.length === 0) throw new Error("--models is required");

  const tasks =
    flags.tasks === "predict"
      ? (["predict"] as const)
      : flags.tasks === "read"
        ? (["read"] as const)
        : (["predict", "read"] as const);

  const windows = loadWindows().map((w) => ({ day: w.day, word: w.word }));
  const limit = flags.limit ? Number(flags.limit) : undefined;
  const concurrency = Number(flags.concurrency ?? 6);
  const rpm = flags.rpm ? Number(flags.rpm) : undefined;
  const provider = flags.provider ? String(flags.provider) : undefined;

  for (const model of models) {
    await runModel(windows, { model, tasks: [...tasks], concurrency, limit, provider, rpm });
  }

  const data = writeReport();
  for (const s of data.scores) {
    if (models.includes(s.model)) console.log(scoreLine(s));
  }
} else if (cmd === "interpretations") {
  writeInterpretations(loadWindows(), listRuns());
} else if (cmd === "score" || cmd === "report" || cmd === "all") {
  const data = writeReport();
  console.log(
    `scored ${data.scores.length} models over ${data.dataset.windows} windows`
  );
  if (cmd === "score") {
    for (const s of data.scores) {
      console.log(
        `${s.model}: predict ${(100 * s.predict.acc).toFixed(1)}%  read ${(100 * s.read.agree).toFixed(1)}%  gap ${(100 * s.gap).toFixed(1)}`
      );
    }
  }
} else if (cmd && cmd.includes("/")) {
  // One-command self-serve: `rtr-bench <model-id>` runs and reports.
  const windows = loadWindows().map((w) => ({ day: w.day, word: w.word }));
  await runModel(windows, {
    model: cmd,
    tasks: ["predict", "read"],
    concurrency: Number(flags.concurrency ?? 6),
    limit: flags.limit ? Number(flags.limit) : undefined,
    provider: flags.provider ? String(flags.provider) : undefined,
  });
  const data = writeReport();
  const s = data.scores.find((x) => x.model === cmd);
  if (s) console.log(scoreLine(s));
} else if (cmd === "providers") {
  const id = rest.find((a) => !a.startsWith("--"));
  if (!id) throw new Error("usage: rtr-bench providers <model-id>");
  console.table(await listEndpoints(id));
} else {
  const here = path.dirname(fileURLToPath(import.meta.url));
  console.log(fs.readFileSync(path.join(here, "..", "README.md"), "utf8").slice(0, 1200));
}
