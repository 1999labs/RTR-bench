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
import { runModel, listModels } from "./run.ts";
import { writeReport, scoreLine } from "./report.ts";

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

if (cmd === "catalog") {
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

  for (const model of models) {
    await runModel(windows, { model, tasks: [...tasks], concurrency, limit });
  }

  const data = writeReport();
  for (const s of data.scores) {
    if (models.includes(s.model)) console.log(scoreLine(s));
  }
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
  });
  const data = writeReport();
  const s = data.scores.find((x) => x.model === cmd);
  if (s) console.log(scoreLine(s));
} else {
  const here = path.dirname(fileURLToPath(import.meta.url));
  console.log(fs.readFileSync(path.join(here, "..", "README.md"), "utf8").slice(0, 1200));
}
