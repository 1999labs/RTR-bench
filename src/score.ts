// Metrics and confidence intervals.
//
// Every accuracy number is bootstrapped by window, not by call, because calls
// inside a window are not independent: four orders of the same word, and in
// the largest window 1,163 marks that belong to one question.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QUADRANTS, type Task } from "./prompt.ts";

export const SCORING_VERSION = "v2";

export type Window = {
  day: number;
  word: string;
  n: number;
  counts: { tl: number; tr: number; bl: number; br: number };
  dominant: "tl" | "tr" | "bl" | "br";
  dominantShare: number;
  centroid: { x: number; y: number };
};

const KEY_TO_SLUG: Record<string, string> = {
  tl: "performed+uniting",
  tr: "honest+uniting",
  bl: "performed+dividing",
  br: "honest+dividing",
};

const CENTER: Record<string, { x: number; y: number }> = {
  "performed+uniting": { x: 0.25, y: 0.25 },
  "honest+uniting": { x: 0.75, y: 0.25 },
  "performed+dividing": { x: 0.25, y: 0.75 },
  "honest+dividing": { x: 0.75, y: 0.75 },
};

export function loadWindows(): Window[] {
  // Resolve against the module, not the caller's cwd, so a globally installed
  // `rtr-bench` can find its own dataset.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(
    fs.readFileSync(path.join(here, "..", "data", "windows.json"), "utf8")
  );
  return raw.windows;
}

export function slugOfKey(key: string): string {
  return KEY_TO_SLUG[key];
}

export function winningKeys(w: Window): string[] {
  const largest = Math.max(...Object.values(w.counts));
  return Object.keys(w.counts).filter((key) => w.counts[key as keyof Window["counts"]] === largest);
}

export function crowdWinners(w: Window): string[] {
  return winningKeys(w).map(slugOfKey);
}

export function randomBaseline(windows: Window[]): number {
  return windows.reduce((sum, w) => sum + crowdWinners(w).length / QUADRANTS.length, 0) / windows.length;
}

export type Call = {
  day: number;
  order: number;
  task: Task;
  parsed: { quadrant: string; confidence: number } | null;
  cost: number;
  provider: string | null;
};

export type WindowAnswer = {
  day: number;
  word: string;
  choice: string | null;
  confidence: number | null;
  unstable: boolean;
  tie: boolean;
  missing: number;
  votes: Record<string, number>;
  pattern: VotePattern;
};

export type VotePattern = "4-0" | "3-1" | "2-1-1" | "2-2" | "1-1-1-1" | "incomplete" | "missing";
export type VoteConsistency = {
  windows: number;
  completeWindows: number;
  unanimous: number;
  unanimousRate: number;
  invalidOrMissingCalls: number;
  patterns: Record<VotePattern, number>;
};

export function summarizeConsistency(answers: WindowAnswer[]): VoteConsistency {
  const patterns: Record<VotePattern, number> = {
    "4-0": 0, "3-1": 0, "2-1-1": 0, "2-2": 0, "1-1-1-1": 0, incomplete: 0, missing: 0,
  };
  for (const a of answers) patterns[a.pattern]++;
  return {
    windows: answers.length,
    completeWindows: answers.filter((a) => a.missing === 0).length,
    unanimous: patterns["4-0"],
    unanimousRate: answers.length ? patterns["4-0"] / answers.length : NaN,
    invalidOrMissingCalls: answers.reduce((sum, a) => sum + a.missing, 0),
    patterns,
  };
}

export function readModel(dir: string): Call[] {
  const out: Call[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const task of ["predict", "read"] as Task[]) {
    const td = path.join(dir, task);
    if (!fs.existsSync(td)) continue;
    for (const f of fs.readdirSync(td)) {
      if (!f.endsWith(".json")) continue;
      const rec = JSON.parse(fs.readFileSync(path.join(td, f), "utf8"));
      out.push({
        day: rec.day,
        order: rec.order,
        task,
        parsed: rec.parsed ?? null,
        cost: rec.usage?.cost ?? rec.usage?.total_cost ?? 0,
        provider: rec.provider ?? null,
      });
    }
  }
  return out;
}

export function collapse(calls: Call[], task: Task, windows: Window[]): WindowAnswer[] {
  const byDay = new Map<number, Call[]>();
  for (const c of calls) {
    if (c.task !== task) continue;
    if (!byDay.has(c.day)) byDay.set(c.day, []);
    byDay.get(c.day)!.push(c);
  }

  const out: WindowAnswer[] = [];
  for (const w of windows) {
    const attempted = byDay.get(w.day);
    if (!attempted) continue;
    const got = attempted.filter((c) => c.parsed);

    const tally = new Map<string, number>();
    const conf = new Map<string, number>();
    for (const c of got) {
      const q = c.parsed!.quadrant;
      tally.set(q, (tally.get(q) ?? 0) + 1);
      conf.set(q, (conf.get(q) ?? 0) + c.parsed!.confidence);
    }

    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    const tied = top ? ranked.filter((r) => r[1] === top[1]) : [];
    const choice = top && tied.length === 1 ? top[0] : null;
    const shape = ranked.map(([, n]) => n).join("-");
    const pattern: VotePattern = got.length === 0 ? "missing" : got.length < 4 ? "incomplete" : shape === "4" ? "4-0" : shape as VotePattern;

    out.push({
      day: w.day,
      word: w.word,
      choice,
      confidence: choice ? conf.get(choice)! / tally.get(choice)! : null,
      unstable: got.length < 4 || tied.length > 1,
      tie: tied.length > 1,
      missing: 4 - got.length,
      votes: Object.fromEntries(tally),
      pattern,
    });
  }
  return out;
}

export function bootstrapCI(
  values: number[],
  reps = 2000,
  start = 7
): [number, number] {
  if (values.length === 0) return [NaN, NaN];
  let s = start;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const means: number[] = [];
  for (let r = 0; r < reps; r++) {
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[Math.floor(rand() * values.length)];
    }
    means.push(sum / values.length);
  }
  means.sort((a, b) => a - b);
  return [means[Math.floor(0.025 * reps)], means[Math.floor(0.975 * reps)]];
}

export type Score = {
  model: string;
  windows: number;
  predict: { acc: number; ci: [number, number]; consistency: VoteConsistency };
  axes: { x: number; y: number; nX: number; nY: number };
  brier: number;
  read: { agree: number; ci: [number, number]; consistency: VoteConsistency };
  crowdDistance: number;
  gap: number;
  instability: number;
  parseFailures: number;
  costUsd: number;
  providers: Record<string, number>;
};

export function scoreModel(model: string, windows: Window[], rawDir = path.join("results", "raw")): Score {
  const dir = path.join(rawDir, model);
  const calls = readModel(dir);

  // The directory name is a slug; the display name and the exact id live in
  // each raw file.
  let display = model;
  for (const task of ["predict", "read"]) {
    const td = path.join(dir, task);
    if (!fs.existsSync(td)) continue;
    const f = fs.readdirSync(td).find((x) => x.endsWith(".json"));
    if (f) {
      display = JSON.parse(fs.readFileSync(path.join(td, f), "utf8")).model ?? model;
      break;
    }
  }

  const pred = collapse(calls, "predict", windows);
  const read = collapse(calls, "read", windows);
  const byDay = new Map(windows.map((w) => [w.day, w]));

  const predHits: number[] = [];
  const readHits: number[] = [];
  const axisX: number[] = [];
  const axisY: number[] = [];
  const briers: number[] = [];
  const dists: number[] = [];

  for (const a of pred) {
    const w = byDay.get(a.day)!;
    const winners = crowdWinners(w);
    predHits.push(a.choice && winners.includes(a.choice) ? 1 : 0);

    const xRight = w.counts.tr + w.counts.br;
    const xLeft = w.counts.tl + w.counts.bl;
    const yTop = w.counts.tl + w.counts.tr;
    const yBottom = w.counts.bl + w.counts.br;

    const xSide = w.counts.tr + w.counts.br > xLeft ? "honest" : "performed";
    const ySide = yBottom > yTop ? "dividing" : "uniting";
    if (xRight !== xLeft) axisX.push(a.choice?.startsWith(xSide) ? 1 : 0);
    if (yTop !== yBottom) axisY.push(a.choice?.endsWith(ySide) ? 1 : 0);

    // Multiclass Brier: p on the chosen label, the rest spread evenly. A tie
    // has no chosen label, so it is left out of the calibration score. Crowd
    // ties use an equal-mass target over all co-winners, never an arbitrary one.
    if (a.choice && a.confidence !== null) {
      const p = a.confidence;
      const rest = (1 - p) / 3;
      let b = 0;
      for (const q of QUADRANTS) {
        const target = winners.includes(q) ? 1 / winners.length : 0;
        b += (q === a.choice ? (p - target) ** 2 : (rest - target) ** 2);
      }
      briers.push(b);
    }
  }

  for (const a of read) {
    const w = byDay.get(a.day)!;
    readHits.push(a.choice && crowdWinners(w).includes(a.choice) ? 1 : 0);
    if (a.choice) {
      const c = CENTER[a.choice];
      dists.push(Math.hypot(c.x - w.centroid.x, c.y - w.centroid.y) / Math.SQRT2);
    }
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const predictAcc = mean(predHits);
  const readAgree = mean(readHits);

  const providers: Record<string, number> = {};
  for (const c of calls) {
    if (c.provider) providers[c.provider] = (providers[c.provider] ?? 0) + 1;
  }

  return {
    model: display,
    windows: predHits.length,
    predict: { acc: predictAcc, ci: bootstrapCI(predHits), consistency: summarizeConsistency(pred) },
    axes: { x: mean(axisX), y: mean(axisY), nX: axisX.length, nY: axisY.length },
    brier: mean(briers),
    read: { agree: readAgree, ci: bootstrapCI(readHits), consistency: summarizeConsistency(read) },
    crowdDistance: mean(dists),
    gap: readAgree - predictAcc,
    instability: pred.length ? pred.filter((a) => a.unstable).length / pred.length : NaN,
    parseFailures: calls.filter((c) => !c.parsed).length,
    costUsd: calls.reduce((a, c) => a + c.cost, 0),
    providers,
  };
}

// ---- Baselines ----

export function majorityBaseline(windows: Window[]) {
  const tally = new Map<string, number>();
  for (const w of windows) {
    for (const key of winningKeys(w)) tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    label: top[0],
    acc: top[1] / windows.length,
    counts: Object.fromEntries(tally),
  };
}

const cueSet = (s: string) =>
  new Set(
    s
      .split(",")
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean)
  );

const DIVIDING = cueSet(
  `WAR, MILITARY, POLICE, PRISON, PRISONS, BORDER, BORDER WALLS, DEBT, CRISIS, CANCEL CULTURE,
   CONSPIRACY, CONSPIRACY THEORIES, SCANDAL, EPSTEIN, JEFFREY EPSTEIN, ADDICTION, RACISM, DEI,
   IMMIGRATION, PROTEST, LAWSUIT, LAWYERS, SURVEILLANCE, GAMBLING, TOBACCO, BIG TOBACCO, PHARMA,
   BIG PHARMA, STEROIDS, OZEMPIC, WELFARE, SOCIALISM, BILLIONAIRES, DEMOCRATS, REPUBLICANS, TRUMP,
   DONALD TRUMP, BIDEN, JOE BIDEN, HARRIS, KAMALA HARRIS, MUSK, ELON MUSK, ZUCKERBERG,
   MARK ZUCKERBERG, ROGAN, JOE ROGAN, TIKTOK, FACEBOOK, SNAPCHAT, CAPITALISM, FOSSIL FUELS,
   AI PSYCHOSIS, DEFENSE CONTRACTORS, KIM JONG-UN, THE CIA, THE US MILITARY, POLICE DEPARTMENTS,
   CHILD PROTECTIVE SERVICES, PRISONS, FAST FASHION`
);

const UNITING = cueSet(
  `LOVE, FAMILY, FRIENDS, COMMUNITY, MARRIAGE, SAME-SEX MARRIAGE, COMPLIMENTS, GRATITUDE, HONOR,
   NATURE, THANKSGIVING, FAMILY DINNERS, ALTRUISM, SACRIFICE, EMPATHY, PATRONAGE, PRIDE`
);

const PERFORMED = cueSet(
  `INFLUENCERS, INFLUENCER, ADVERTISING, REALITY TV, GAME SHOWS, RED CARPETS, THE OLYMPICS,
   THE WORLD CUP, DISNEY WORLD, COACHELLA, ART BASEL, TIMES SQUARE, LAS VEGAS, INSTAGRAM, NETFLIX,
   SITCOMS, MOOD BOARDS, BUMPER STICKERS, NATIONAL ANTHEMS, CONCESSION SPEECHES, PUBLIC APOLOGIES,
   STATUS, FOMO, SPECULATION, FLOOR PRICES, NON-FUNGIBLE TOKENS, GENERATIVE ART, ART BLOCKS,
   CREDIT CARDS, MICHELIN STARS, CONTENT CREATORS, BRAT SUMMER, CANCEL CULTURE, PATRONAGE`
);

const HONEST = cueSet(
  `THERAPY, TRAUMA, TRAUMA DUMPING, GRIEF, DEATH, SILENCE, MEMORY, DREAMS, DIARY, HANDWRITTEN NOTES,
   EYE CONTACT, READ RECEIPTS, SOBRIETY, HONESTY, VULNERABILITY, LOVE AT FIRST SIGHT, SACRIFICE,
   ALTRUISM, EMPATHY`
);

export function lexicalBaseline(windows: Window[]) {
  // Defaults are the dataset's marginal sides, so the rule is "cue where there
  // is a cue, the crowd's prior otherwise".
  const xHonest =
    windows.reduce((a, w) => a + w.counts.tr + w.counts.br, 0) /
    windows.reduce((a, w) => a + w.n, 0);
  const yDividing =
    windows.reduce((a, w) => a + w.counts.bl + w.counts.br, 0) /
    windows.reduce((a, w) => a + w.n, 0);

  const hits: number[] = [];
  const answers: { day: number; word: string; guess: string; truth: string[] }[] = [];

  for (const w of windows) {
    const word = w.word.toUpperCase();
    // The y axis is uniting/dividing, the x axis is performed/honest.
    const yCue = DIVIDING.has(word) ? "dividing" : UNITING.has(word) ? "uniting" : null;
    const xCue = HONEST.has(word) ? "honest" : PERFORMED.has(word) ? "performed" : null;
    const xSide = xCue ?? (xHonest > 0.5 ? "honest" : "performed");
    const ySide = yCue ?? (yDividing > 0.5 ? "dividing" : "uniting");
    const guess = `${xSide}+${ySide}`;
    const truth = crowdWinners(w);
    hits.push(truth.includes(guess) ? 1 : 0);
    answers.push({ day: w.day, word: w.word, guess, truth });
  }

  const acc = hits.reduce((a, b) => a + b, 0) / hits.length;
  return { acc, ci: bootstrapCI(hits), answers };
}
