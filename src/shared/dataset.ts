import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Window } from "../score.ts";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");

// Works from source modules and the bundled dist/cli.js, independently of cwd.
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg) && JSON.parse(fs.readFileSync(pkg, "utf8")).name === "rtr-bench") return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("Cannot locate rtr-bench package data");
    dir = parent;
  }
}

export type Split = {
  version: string; datasetSha256: string; rule: string;
  grouping: { method: string; aliases: Record<string, string>; decisions: string[] };
  reference: number[]; development: number[]; evaluation: number[];
};
export type Partition = "development" | "evaluation";
export const groupKey = (word: string) => word.trim().toLowerCase().replace(/\s+/g, " ");

export function validateSplit(windows: Window[], split: Split, datasetHash: string) {
  if (split.datasetSha256 !== datasetHash) throw new Error("Dataset fingerprint differs from split manifest");
  const byDay = new Map(windows.map(w => [w.day, w]));
  if (byDay.size !== windows.length) throw new Error("Duplicate dataset day");
  const seen = new Set<number>(), groups = new Map<string, string>();
  for (const w of windows) {
    const counts = [w.counts.tl, w.counts.tr, w.counts.bl, w.counts.br];
    if (!Number.isInteger(w.n) || w.n <= 0 || counts.some(n => !Number.isInteger(n) || n < 0) || counts.reduce((a,b) => a+b, 0) !== w.n) throw new Error(`Invalid counts for day ${w.day}`);
  }
  for (const part of ["reference", "development", "evaluation"] as const) {
    if (!Array.isArray(split[part]) || !split[part].length) throw new Error(`Empty split: ${part}`);
    for (const day of split[part]) {
      const w = byDay.get(day);
      if (!w || seen.has(day)) throw new Error(`Unknown or duplicate split day ${day}`);
      seen.add(day);
      const key = split.grouping.aliases[groupKey(w.word)] ?? groupKey(w.word);
      if (groups.has(key) && groups.get(key) !== part) throw new Error(`Entity crosses splits: ${key}`);
      groups.set(key, part);
    }
  }
  if (seen.size !== windows.length) throw new Error("Split must cover every dataset window");
  if (Math.max(...split.reference) >= Math.min(...split.development) || Math.max(...split.development) >= Math.min(...split.evaluation)) throw new Error("Split must be chronological");
}

export function loadDistributionData() {
  const root = packageRoot();
  const raw = fs.readFileSync(path.join(root, "data/windows.json"), "utf8");
  const splitRaw = fs.readFileSync(path.join(root, "data/splits/v1.json"), "utf8");
  const windows: Window[] = JSON.parse(raw).windows;
  const split: Split = JSON.parse(splitRaw);
  const datasetHash = digest(raw);
  validateSplit(windows, split, datasetHash);
  return { windows, split, datasetHash, splitHash: digest(splitRaw) };
}
