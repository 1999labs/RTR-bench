// OpenRouter runner. One JSON file per call, written as soon as the call
// returns, so a crash or a timeout resumes where it stopped.

import fs from "node:fs";
import path from "node:path";
import { buildMessages, parseAnswer, type Task, PROMPT_HASH, PROMPT_VERSION } from "./prompt.ts";

const API = "https://openrouter.ai/api/v1/chat/completions";

// Read lazily so a .env loaded by the CLI is visible here.
const apiKey = () => process.env.OPENROUTER_API_KEY ?? "";

export type Window = { day: number; word: string };

export type RunOptions = {
  model: string;
  tasks: Task[];
  concurrency: number;
  limit?: number;
  maxUsd?: number;
};

export function slug(model: string): string {
  return model.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}

type Result = {
  model: string;
  day: number;
  order: number;
  task: Task;
  promptVersion: string;
  promptHash: string;
  temperature: number | null;
  reasoningEffort: string | null;
  request: unknown;
  raw: string;
  parsed: { quadrant: string; confidence: number } | null;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  provider: string | null;
  error: string | null;
  at: string;
};

async function call(model: string, task: Task, word: string, order: number) {
  const messages = buildMessages(task, word, order);
  const body: any = {
    model,
    messages,
    temperature: 0,
    reasoning: { effort: "low" },
    max_tokens: 400,
    usage: { include: true },
  };

  const post = async () =>
    fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mixedmessages.fyi",
        "X-Title": "RTR-bench",
      },
      body: JSON.stringify(body),
    });

  let res = await post();
  let status = res.status;

  // Some models reject temperature or reasoning. Strip the offending field and
  // record that the run is not identical to a temperature-0 run.
  if (status === 400 || status === 422) {
    let text = await res.text();
    if (/temperature/i.test(text)) {
      delete body.temperature;
      res = await post();
      status = res.status;
      if (status >= 400) text = await res.text();
    }
    if (status === 400 || status === 422) {
      if (/reasoning/i.test(text)) {
        delete body.reasoning;
        res = await post();
        status = res.status;
        if (status >= 400) text = await res.text();
      }
    }
    if (status >= 400) throw new Error(`HTTP ${status}: ${text.slice(0, 300)}`);
  }

  if (status < 200 || status >= 300) {
    const text = await res.text();
    throw new Error(`HTTP ${status}: ${text.slice(0, 300)}`);
  }

  const j = await res.json();
  return {
    json: j,
    body,
    temperature: "temperature" in body ? 0 : null,
    reasoningEffort: (body.reasoning?.effort as string) ?? null,
  };
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = String((e as Error).message ?? e);
      const retriable = /HTTP (429|500|502|503|504)|fetch failed|timeout/i.test(msg);
      if (!retriable) throw e;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i + Math.random() * 400));
    }
  }
  throw last;
}

export async function runModel(windows: Window[], opts: RunOptions) {
  if (!apiKey())
    throw new Error(
      "OPENROUTER_API_KEY is not set. Put it in .env in this directory, or export it in your shell."
    );
  const dir = path.join("results", "raw", slug(opts.model));
  let done = 0;
  let failed = 0;
  let tokens = 0;
  let usd = 0;

  const list = opts.limit ? windows.slice(0, opts.limit) : windows;
  const jobs: { day: number; word: string; task: Task; order: number }[] = [];
  for (const w of list) {
    for (const task of opts.tasks) {
      for (let order = 0; order < 4; order++) {
        jobs.push({ day: w.day, word: w.word, task, order });
      }
    }
  }

  const file = (j: (typeof jobs)[number]) =>
    path.join(dir, j.task, `${j.day}-${j.order}.json`);

  const queue = jobs.filter((j) => !fs.existsSync(file(j)));
  console.log(
    `${opts.model}: ${jobs.length} calls, ${jobs.length - queue.length} already on disk, ${queue.length} to go`
  );

  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const j = queue[cursor++];
      const target = file(j);
      fs.mkdirSync(path.dirname(target), { recursive: true });

      let rec: Result;
      try {
        const { json, body, temperature, reasoningEffort } = await withRetry(() =>
          call(opts.model, j.task, j.word, j.order)
        );
        const raw = json?.choices?.[0]?.message?.content ?? "";
        const usage = json?.usage ?? {};
        tokens += usage.total_tokens ?? 0;
        usd += Number(json?.usage?.total_cost ?? 0);

        rec = {
          model: opts.model,
          day: j.day,
          order: j.order,
          task: j.task,
          promptVersion: PROMPT_VERSION,
          promptHash: PROMPT_HASH,
          temperature,
          reasoningEffort,
          request: body,
          raw,
          parsed: parseAnswer(raw),
          usage,
          provider: json?.provider ?? null,
          error: null,
          at: new Date().toISOString(),
        };
      } catch (e) {
        failed++;
        rec = {
          model: opts.model,
          day: j.day,
          order: j.order,
          task: j.task,
          promptVersion: PROMPT_VERSION,
          promptHash: PROMPT_HASH,
          temperature: 0,
          reasoningEffort: null,
          request: null,
          raw: "",
          parsed: null,
          usage: {},
          provider: null,
          error: String((e as Error).message ?? e),
          at: new Date().toISOString(),
        };
      }

      fs.writeFileSync(target, JSON.stringify(rec, null, 2));
      done++;
      if (done % 25 === 0) {
        process.stdout.write(
          `  ${done}/${queue.length}  tokens ${tokens.toLocaleString()}  fail ${failed}\n`
        );
      }
    }
  };

  await Promise.all(Array.from({ length: opts.concurrency }, worker));
  console.log(`${opts.model}: wrote ${done}, failed ${failed}, tokens ${tokens.toLocaleString()}`);
  return { done, failed, tokens, usd };
}

export async function listModels() {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "User-Agent": "RTR-bench", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  const j = await res.json();
  return j.data as any[];
}
