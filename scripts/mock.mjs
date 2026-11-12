// Generate a fake model's raw results so the scorer and report can be tested
// without spending a cent. Not part of the benchmark.
//
//   node scripts/mock.mjs [accuracy]

import fs from "node:fs";
import path from "node:path";

const acc = Number(process.argv[2] ?? 0.7);
const data = JSON.parse(fs.readFileSync("data/windows.json", "utf8"));
const KEY = ["tl", "tr", "bl", "br"];
const SLUG = {
  tl: "performed+uniting",
  tr: "honest+uniting",
  bl: "performed+dividing",
  br: "honest+dividing",
};
const dir = path.join("results", "raw", "mock-model");

let s = 12345;
const rand = () => {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
};

for (const task of ["predict", "read"]) {
  fs.mkdirSync(path.join(dir, task), { recursive: true });
  for (const w of data.windows) {
    const truth = SLUG[w.dominant];
    const right = rand() < acc;
    const other = KEY.filter((k) => SLUG[k] !== truth);
    const pick = right ? truth : SLUG[other[Math.floor(rand() * 3)]];
    for (let order = 0; order < 4; order++) {
      // 15 percent of windows are unstable: one order disagrees.
      const flip = !right && order === 0 ? truth : pick;
      const quadrant = rand() < 0.03 && order === 3 ? SLUG[other[0]] : flip;
      const rec = {
        model: "mock-model",
        day: w.day,
        order,
        task,
        promptVersion: "v1",
        promptHash: "mock",
        temperature: 0,
        parsed: { quadrant, confidence: 0.6 },
        raw: JSON.stringify({ quadrant, confidence: 0.6 }),
        usage: {},
        error: null,
      };
      fs.writeFileSync(path.join(dir, task, `${w.day}-${order}.json`), JSON.stringify(rec));
    }
  }
}
console.log(`mock results written for ${data.windows.length} windows at ${acc} accuracy`);
