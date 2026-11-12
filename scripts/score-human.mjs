// Score human responses from human/index.html.
//
//   cat human/*.csv | node scripts/score-human.mjs
//   node scripts/score-human.mjs human/a.csv human/b.csv
//
// Each participant sees the same 21 words. Accuracy is scored per participant
// against the plurality of the full field, then averaged across participants.

import fs from "node:fs";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("pass one or more csv files");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync("data/windows.json", "utf8"));
const SLUG = {
  tl: "performed+uniting",
  tr: "honest+uniting",
  bl: "performed+dividing",
  br: "honest+dividing",
};
const truth = new Map(data.windows.map((w) => [w.day, SLUG[w.plurality]]));

const byPerson = new Map();

for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").trim().split("\n");
  const header = lines.shift().split(",");
  const pi = header.indexOf("participant");
  const di = header.indexOf("day");
  const ci = header.indexOf("choice");
  for (const line of lines) {
    const cols = line.split(",");
    const person = cols[pi];
    const day = Number(cols[di]);
    const choice = cols[ci];
    if (!truth.has(day) || !choice) continue;
    if (!byPerson.has(person)) byPerson.set(person, []);
    byPerson.get(person).push({ day, hit: choice === truth.get(day) ? 1 : 0 });
  }
}

const perPerson = [];
for (const [person, rows] of byPerson) {
  const acc = rows.reduce((a, r) => a + r.hit, 0) / rows.length;
  perPerson.push({ person, n: rows.length, acc });
  console.log(`${person}: ${(100 * acc).toFixed(1)}% over ${rows.length} words`);
}

if (perPerson.length > 1) {
  const mean = perPerson.reduce((a, p) => a + p.acc, 0) / perPerson.length;
  const lo = Math.min(...perPerson.map((p) => p.acc));
  const hi = Math.max(...perPerson.map((p) => p.acc));
  console.log(`\nhuman baseline: ${(100 * mean).toFixed(1)}% mean across ${perPerson.length} people, range ${(100 * lo).toFixed(1)}%-${(100 * hi).toFixed(1)}%`);
} else if (perPerson.length === 1) {
  console.log(`\none person only: ${(100 * perPerson[0].acc).toFixed(1)}%`);
}
