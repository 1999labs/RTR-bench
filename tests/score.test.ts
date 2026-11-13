import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collapse, crowdWinners, lexicalBaseline, majorityBaseline, randomBaseline, scoreModel, summarizeConsistency, type Call, type Window } from "../src/score.ts";

const hu = "honest+uniting", hd = "honest+dividing", pu = "performed+uniting", pd = "performed+dividing";
const window = (day: number, tied = false): Window => ({ day, word: "FREEDOM", n: tied ? 20 : 10, counts: { tl: tied ? 0 : 10, tr: tied ? 10 : 0, bl: 0, br: tied ? 10 : 0 }, dominant: tied ? "tr" : "tl", dominantShare: tied ? 0.5 : 1, centroid: { x: 0.5, y: 0.5 } });
const call = (day: number, order: number, quadrant: string | null): Call => ({ day, order, task: "predict", parsed: quadrant ? { quadrant, confidence: quadrant === pd ? 0.99 : 0.8 } : null, cost: 0, provider: "Host" });

test("crowd co-winners and baselines are derived from counts, independent of the legacy dominant field", () => {
  const tied = window(1, true), single = window(2);
  assert.deepEqual(crowdWinners(tied), [hu, hd]);
  assert.deepEqual(crowdWinners({ ...tied, dominant: "br" }), [hu, hd]);
  assert.equal(randomBaseline([tied, single]), 0.375);
  const majority = majorityBaseline([tied, single]);
  assert.equal(majority.acc, 0.5);
  assert.equal(Object.values(majority.counts).reduce((a, b) => a + b, 0), 3);
  const lexical = lexicalBaseline([tied, single]);
  assert.deepEqual(lexical.answers[0].truth, [hu, hd]);
  assert.deepEqual(lexicalBaseline([{ ...tied, dominant: "br" }, single]), lexical);
});

test("unique plurality wins, confidence cannot break vote ties, and missing answers never become unanimous", () => {
  const patterns = [[hu, hu, hu, hu], [hd, hd, hd, pd], [pu, pu, hu, hd], [pu, pu, pd, pd], [hu, hd, pu, pd], [hd, hd, hd, null], [null, null, null, null]];
  const windows = patterns.map((_, i) => window(i + 1));
  const calls = patterns.flatMap((qs, i) => qs.map((q, order) => call(i + 1, order, q)));
  const answers = collapse(calls, "predict", [...windows, window(8)]);
  assert.equal(answers.length, 7, "unattempted windows must not inflate a limited run's denominator");
  assert.deepEqual(answers.map(a => a.choice), [hu, hd, pu, null, null, hd, null]);
  assert.equal(answers[3].confidence, null);
  const c = summarizeConsistency(answers);
  assert.equal(c.unanimous, 1);
  assert.equal(c.unanimousRate, 1 / 7);
  assert.equal(c.completeWindows, 5);
  assert.equal(c.invalidOrMissingCalls, 5);
  assert.deepEqual(c.patterns, { "4-0": 1, "3-1": 1, "2-1-1": 1, "2-2": 1, "1-1-1-1": 1, incomplete: 1, missing: 1 });
});

test("scoring accepts tied crowd winners, counts wholly invalid attempted windows as misses, and keeps task consistency separate", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtr-v2-score-"));
  const model = "example@host", windows = [window(1, true), ...[2, 3, 4, 5, 6].map(d => window(d))];
  const predictions = [[hd, hd, hd, hd], [pu, pu, pd, pd], [null, null, null, null], [pu, pu, hu, hd], [pu, pu, pu, null]];
  for (const task of ["predict", "read"] as const) {
    const dir = path.join(root, model, task); fs.mkdirSync(dir, { recursive: true });
    predictions.forEach((qs, i) => qs.forEach((q, order) => {
      const r = call(i + 1, order, q);
      fs.writeFileSync(path.join(dir, `${i + 1}-${order}.json`), JSON.stringify({ ...r, task, model: "example/model", parsed: q ? { quadrant: q, confidence: 0.8 } : null, usage: { cost: 0.01 } }));
    }));
  }
  const s = scoreModel(model, windows, root);
  assert.equal(s.windows, 5);
  assert.equal(s.predict.acc, 3 / 5);
  assert.equal(s.read.agree, 3 / 5);
  assert.equal(s.predict.consistency.unanimousRate, 1 / 5);
  assert.equal(s.read.consistency.patterns.missing, 1);
  assert.equal(s.parseFailures, 10);
  const expectedBrier = ((0.8 - 0.5) ** 2 + ((0.2 / 3) - 0.5) ** 2 + 2 * (0.2 / 3) ** 2 + 2 * ((0.8 - 1) ** 2 + 3 * (0.2 / 3) ** 2)) / 3;
  assert.ok(Math.abs(s.brier - expectedBrier) < 1e-12);
  const swapped = scoreModel(model, [{ ...windows[0], dominant: "br" }, ...windows.slice(1)], root);
  assert.deepEqual(swapped, s, "a legacy tie-break label must not affect any v2 metric");
});
