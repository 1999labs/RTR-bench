import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Script } from "node:vm";
import { buildInterpretations, interpretationCell, interpretationsHtml, interpretationsMarkdown, writeInterpretations } from "../src/interpretations.ts";
import type { Window } from "../src/score.ts";

test("own readings preserve split votes, missing responses, run identity, and prompt identity", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rtr-interpretations-test-"));
  const run = "example-model@host";
  const windows: Window[] = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1, word: i < 2 ? "REPEATED PROMPT" : `Prompt ${i + 1}`,
    n: 40, counts: { tl: 0, tr: 40, bl: 0, br: 0 }, dominant: "tr",
    dominantShare: 1, centroid: { x: 0.75, y: 0.25 },
  }));
  const hu = "honest+uniting", hd = "honest+dividing", pu = "performed+uniting", pd = "performed+dividing";
  const answers = [[hd, hd, hd, pd], [hu, hu, pd, pd], [pu, pd, hd, hu], [hd, null, hd, null], [null, null, null, null], [pu, pu, pd, hd], [null, null, null, null]];
  for (let day = 1; day <= 7; day++) {
    for (const task of ["predict", "read"]) {
      const dir = path.join(root, run, task); fs.mkdirSync(dir, { recursive: true });
      if (day === 7 && task === "read") continue;
      for (let order = 0; order < 4; order++) {
        const q = task === "predict" ? hu : answers[day - 1][order];
        fs.writeFileSync(path.join(dir, `${day}-${order}.json`), JSON.stringify({ model: "example/model", providerRequested: "Host", provider: "Host", day, task, order, parsed: q ? { quadrant: q, confidence: q === hu ? 0.99 : 0.1 } : null }));
      }
    }
  }
  const data = buildInterpretations(windows, [run], root);
  assert.equal(data.runs[0].model, "example/model");
  assert.equal(data.runs[0].provider, "Host");
  assert.deepEqual(data.runs[0].providers, ["Host"]);
  assert.equal(data.rows[0].readings[0].choice, hd, "predict responses must not affect own readings");
  assert.equal(interpretationCell(data.rows[0].readings[0]), "HD (3/4)");
  assert.equal(data.rows[1].readings[0].status, "tie");
  assert.equal(data.rows[1].readings[0].choice, null, "confidence must not turn a vote tie into a choice");
  assert.equal(data.rows[2].readings[0].status, "tie", "four-way ties also have no final choice");
  assert.equal(interpretationCell(data.rows[3].readings[0]), "HD (2/2)*");
  assert.equal(data.rows[3].readings[0].missingResponses, 2);
  assert.equal(data.rows[4].readings[0].status, "missing");
  assert.equal(data.rows[5].readings[0].choice, pu, "a unique plurality uses the existing scorer's aggregation");
  assert.equal(data.rows[6].readings[0].status, "missing", "absent read files must remain missing");
  assert.deepEqual(data.rows.slice(0, 2).map((r) => r.day), [1, 2], "repeated prompt words must remain separate windows");
  const twoRuns = buildInterpretations(windows, [run, run], root);
  assert.equal(twoRuns.runs.length, 2, "model names alone must not merge runs");
  const output = path.join(root, "output");
  writeInterpretations(windows, [run], output, root);
  assert.ok(fs.readFileSync(path.join(output, "interpretations.md"), "utf8").includes("HD (3/4)"));
});

test("HTML safely embeds prompt text and contains valid interactive JavaScript", () => {
  const data = { runs: [{ id: "a", model: "example/model", provider: null, providers: [] }], rows: [{ day: 1, word: '</script><script>alert("bad")</script>|', crowd: "honest+uniting", readings: [{ choice: "honest+dividing", status: "chosen" as const, votes: { "honest+dividing": 4 }, validResponses: 4, missingResponses: 0 }] }] };
  const html = interpretationsHtml(data);
  assert.equal(html.includes('</script><script>alert("bad")'), false);
  const embedded = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)!;
  assert.equal(JSON.parse(embedded[1]).rows[0].word, data.rows[0].word);
  const interactive = html.match(/<script>\n([\s\S]*?)<\/script>/)!;
  new Script(interactive[1]);
  assert.ok(interpretationsMarkdown(data).includes('\\|'));
  assert.ok(interpretationsHtml({ runs: [], rows: [] }).includes("All runs"));
});
