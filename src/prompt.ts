// The frozen prompt. Bump PROMPT_VERSION and PROMPT_HASH together, never in
// the middle of a leaderboard.

import { createHash } from "node:crypto";

export const PROMPT_VERSION = "v1";

export type Task = "predict" | "read";

export type Reading = { slug: string; gloss: string };

// The four options, in canonical order. The glosses are the ones a participant
// sees on the project's own grid.
export const READINGS: Reading[] = [
  { slug: "performed+uniting", gloss: "creating false unity among us" },
  { slug: "honest+uniting", gloss: "bringing us together, authentically" },
  { slug: "performed+dividing", gloss: "exploiting our divisions, deliberately" },
  { slug: "honest+dividing", gloss: "fracturing us, truthfully" },
];

export const QUADRANTS = READINGS.map((r) => r.slug);

const QUESTION: Record<Task, string> = {
  predict: "Which reading did most people choose?",
  read: "Which reading is yours?",
};

const SYSTEM = "Reply with a single JSON object. No prose, no code fences.";

const TEMPLATE = `WORD: "{word}"

Four readings of it:
{options}

{question}

Reply with JSON only:
{"quadrant": "<one of: ${QUADRANTS.join(" | ")}>", "confidence": <0.0-1.0>}`;

export const PROMPT_HASH = createHash("sha256")
  .update(SYSTEM + "\n\n" + TEMPLATE)
  .digest("hex")
  .slice(0, 16);

// Four cyclic rotations put every option in every position once.
export function orderFor(index: number): Reading[] {
  const n = READINGS.length;
  return READINGS.map((_, i) => READINGS[(i + index) % n]);
}

export function buildMessages(task: Task, word: string, orderIndex: number) {
  const options = orderFor(orderIndex)
    .map((r, i) => `${i + 1}. ${r.slug}: ${r.gloss}`)
    .join("\n");
  const user = TEMPLATE.replace("{word}", word)
    .replace("{options}", options)
    .replace("{question}", QUESTION[task]);
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}

export type Parsed = { quadrant: string; confidence: number } | null;

export function parseAnswer(text: string): Parsed {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let obj: any;
  try {
    obj = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const raw = String(obj.quadrant ?? obj.answer ?? obj.choice ?? "").toLowerCase();
  const norm = raw.replace(/[\s_]+/g, "-").replace(/-/g, "+");
  const hit =
    QUADRANTS.find((q) => q === raw) ??
    QUADRANTS.find((q) => q.replace(/\+/g, "") === norm.replace(/\+/g, ""));

  if (!hit) return null;
  const c = Number(obj.confidence);
  const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0.5;
  return { quadrant: hit, confidence };
}
