import type { Window } from "../score.ts";

export const DISTRIBUTION_VERSION = "distribution-v1";
export const QUADRANTS = ["performed+uniting", "honest+uniting", "performed+dividing", "honest+dividing"] as const;
export type Quadrant = typeof QUADRANTS[number];
export type Distribution = Record<Quadrant, number>;
export const SUM_TOLERANCE = 0.001;
export const FAILURE_ERROR = 2;
export type Validation = { prediction: Distribution | null; error: string | null; originalSum: number | null };

export function validatePrediction(value: unknown): Validation {
  const fail = (error: string, originalSum: number | null = null): Validation => ({ prediction: null, error, originalSum });
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("Expected a JSON object");
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== 4 || QUADRANTS.some(q => !Object.hasOwn(obj, q))) return fail("Expected exactly four canonical quadrant keys");
  if (QUADRANTS.some(q => typeof obj[q] !== "number" || !Number.isFinite(obj[q]) || (obj[q] as number) < 0 || (obj[q] as number) > 1)) return fail("Shares must be finite numbers between zero and one");
  const sum = QUADRANTS.reduce((s,q) => s + (obj[q] as number), 0);
  if (Math.abs(sum - 1) > SUM_TOLERANCE + Number.EPSILON * 4) return fail("Shares must sum to one within 0.001", sum);
  return { prediction: Object.fromEntries(QUADRANTS.map(q => [q, (obj[q] as number) / sum])) as Distribution, error: null, originalSum: sum };
}

export function parsePrediction(raw: string): Validation {
  try { return validatePrediction(JSON.parse(raw)); }
  catch { return { prediction: null, error: raw.trim() ? "Invalid JSON (prose and fences are not accepted)" : "Missing response", originalSum: null }; }
}

export function observed(w: Window): Distribution {
  return Object.fromEntries(QUADRANTS.map((q,i) => [q, [w.counts.tl,w.counts.tr,w.counts.bl,w.counts.br][i] / w.n])) as Distribution;
}
export const distributionError = (p: Distribution, y: Distribution) => QUADRANTS.reduce((s,q) => s + (p[q] - y[q]) ** 2, 0);
export const scoreFromError = (error: number) => 100 * (1 - error / 2);
export const uniform = (): Distribution => Object.fromEntries(QUADRANTS.map(q => [q,.25])) as Distribution;
export function constantBaseline(reference: Window[]): Distribution {
  if (!reference.length) throw new Error("Reference pool is empty");
  return Object.fromEntries(QUADRANTS.map(q => [q, reference.reduce((s,w) => s + observed(w)[q],0) / reference.length])) as Distribution;
}

// A tied prediction shares one unit of credit across its maxima; a uniform
// prediction cannot earn full accuracy simply by naming every quadrant.
export function winnerCredit(p: Distribution, w: Window): number {
  const max = Math.max(...QUADRANTS.map(q => p[q]));
  const predicted = QUADRANTS.filter(q => p[q] === max);
  const counts = [w.counts.tl,w.counts.tr,w.counts.bl,w.counts.br];
  const winners = QUADRANTS.filter((_,i) => counts[i] === Math.max(...counts));
  return predicted.filter(q => winners.includes(q)).length / predicted.length;
}

// Bootstrap entity groups, preserving paired observations for comparisons.
export function meanCI(values: number[], groups: string[], reps = 2000): [number,number] | null {
  if (!values.length) return null;
  const grouped = new Map<string, number[]>();
  values.forEach((v,i) => grouped.set(groups[i], [...(grouped.get(groups[i]) ?? []),v]));
  const blocks = [...grouped.values()], means: number[] = [];
  let seed = 7;
  const rand = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let r=0; r<reps; r++) {
    const sample = Array.from({length:blocks.length}, () => blocks[Math.floor(rand()*blocks.length)]).flat();
    means.push(sample.reduce((a,b)=>a+b,0)/sample.length);
  }
  means.sort((a,b)=>a-b);
  return [means[Math.floor(.025*reps)], means[Math.floor(.975*reps)]];
}
