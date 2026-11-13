// Scatter chart for the README table: score against cost per full run.
// Reads the Results table so the chart and the table can never disagree.
// Usage: node scripts/chart.mjs  ->  results/leaderboard-scatter.svg

import fs from "node:fs";

const README = "README.md";
const OUT_SVG = "results/leaderboard-scatter.svg";
const OUT_PNG = "results/leaderboard-scatter.png";

function readTable() {
  const text = fs.readFileSync(README, "utf8");
  const start = text.indexOf("## Results");
  const end = text.indexOf("## License", start);
  const block = text.slice(start, end === -1 ? undefined : end);
  const rows = [];
  for (const line of block.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const model = cells[1];
    const score = Number(cells[3]);
    const cost = Number(cells[4].replace("$", ""));
    if (!model || !Number.isFinite(score) || !Number.isFinite(cost)) continue;
    if (cells[1] === "Model" || cells[1].startsWith("---")) continue;
    rows.push({ model, score, cost });
  }
  return rows;
}

function shortName(model) {
  const tail = model.split("/").pop();
  return tail
    .replace("-1017", "")
    .replace("m3.1-flash", "m3.1")
    .replace("v2.6-flash", "v2.6")
    .replace("v4.1-flash", "v4.1")
    .replace("3.8-flash", "3.8")
    .replace("small", "")
    .replace(/-+$/, "");
}

const rows = readTable();
if (rows.length === 0) {
  console.error("no scored rows in README Results table");
  process.exit(1);
}

// Geometry
const W = 980;
const H = 620;
const M = { top: 92, right: 96, bottom: 74, left: 74 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;

const yMin = 25;
const yMax = 50;
const xs = rows.map((r) => r.cost);
const xMin = Math.log10(Math.min(...xs) * 0.75);
const xMax = Math.log10(Math.max(...xs) * 1.8);

const xOf = (cost) => M.left + ((Math.log10(cost) - xMin) / (xMax - xMin)) * innerW;
const yOf = (score) => M.top + innerH - ((score - yMin) / (yMax - yMin)) * innerH;

const xTicks = [0.02, 0.05, 0.1, 0.2, 0.5, 1.0].filter(
  (t) => Math.log10(t) >= xMin && Math.log10(t) <= xMax
);
const yTicks = [25, 30, 35, 40, 45, 50];

const esc = (s) =>
  String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

// Baseline values from the last scoring run
let baselines = { random: 0.25, majorityClass: { acc: 0.3152 }, lexical: { acc: 0.339 } };
try {
  const s = JSON.parse(fs.readFileSync("results/scores.json", "utf8"));
  baselines = s.baselines ?? baselines;
} catch {}

const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
parts.push(`<rect width="100%" height="100%" fill="#fff"/>`);

// Title
parts.push(
  `<text x="24" y="34" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="16" fill="#111">RTR-bench: score against cost</text>`
);
parts.push(
  `<text x="24" y="54" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" fill="#666">${rows.length} models, each a full run of 1,320 calls pinned to one host. ${"165"} windows, 4 readings, 4 orders.</text>`
);

// Grid + y axis
for (const t of yTicks) {
  const y = yOf(t);
  parts.push(
    `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + innerW}" y2="${y.toFixed(1)}" stroke="#ececec"/>`
  );
  parts.push(
    `<text x="${M.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="#666">${t}</text>`
  );
}
parts.push(
  `<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${M.top + innerH}" stroke="#999"/>`
);
parts.push(
  `<text transform="translate(22 ${M.top + innerH / 2}) rotate(-90)" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#444">score / 100</text>`
);

// X axis
parts.push(
  `<line x1="${M.left}" y1="${M.top + innerH}" x2="${M.left + innerW}" y2="${M.top + innerH}" stroke="#999"/>`
);
for (const t of xTicks) {
  const x = xOf(t);
  parts.push(
    `<line x1="${x.toFixed(1)}" y1="${M.top + innerH}" x2="${x.toFixed(1)}" y2="${M.top + innerH + 5}" stroke="#999"/>`
  );
  parts.push(
    `<text x="${x.toFixed(1)}" y="${M.top + innerH + 19}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#666">$${t < 0.1 ? t.toFixed(2) : t.toFixed(2)}</text>`
  );
}
parts.push(
  `<text x="${M.left + innerW / 2}" y="${H - 24}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#444">cost per full run, USD, log scale</text>`
);

// Baselines
const baselineLines = [
  { v: baselines.random * 100, color: "#c9c9c9", label: `chance ${(baselines.random * 100).toFixed(1)}` },
  { v: baselines.majorityClass.acc * 100, color: "#8a8a8a", label: `most common ${(baselines.majorityClass.acc * 100).toFixed(1)}` },
  { v: baselines.lexical.acc * 100, color: "#b06000", label: `lexical cue list ${(baselines.lexical.acc * 100).toFixed(1)}` },
];
baselineLines.forEach((b, i) => {
  const y = yOf(b.v);
  parts.push(
    `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + innerW}" y2="${y.toFixed(1)}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="5 4"/>`
  );
  parts.push(
    `<text x="${M.left + 6}" y="${(y - 5).toFixed(1)}" font-family="ui-monospace, monospace" font-size="9.5" fill="${b.color}">${esc(b.label)}</text>`
  );
});

// Points, with greedy label placement to avoid collisions
const placed = [];
const boxesOverlap = (a, b) =>
  a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

const sorted = [...rows].sort((a, b) => a.cost - b.cost);
for (const r of sorted) {
  const px = xOf(r.cost);
  const py = yOf(r.score);
  parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.6" fill="#1f6feb"/>`);

  const text = shortName(r.model);
  const tw = text.length * 6.1 + 4;
  const leftSide = px > M.left + innerW * 0.72;
  const offsets = [-9, 15, -24, 30, -39, 45, -54, 60];
  let chosen = null;
  for (const dy of offsets) {
    const x1 = leftSide ? px - 10 - tw : px + 10;
    const box = { x1, x2: x1 + tw, y1: py + dy - 9, y2: py + dy + 3, dy };
    if (!placed.some((p) => boxesOverlap(box, p))) {
      chosen = box;
      break;
    }
  }
  if (!chosen) chosen = { x1: px + 10, x2: px + 10 + tw, y1: py - 9, y2: py + 3, dy: -9 };
  placed.push(chosen);

  const anchor = leftSide ? "end" : "start";
  const lx = leftSide ? px - 10 : px + 10;
  if (Math.abs(chosen.dy) > 14) {
    parts.push(
      `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(py + chosen.dy).toFixed(1)}" stroke="#b9c9e6" stroke-width="0.8"/>`
    );
  }
  parts.push(
    `<text x="${lx.toFixed(1)}" y="${(py + chosen.dy).toFixed(1)}" text-anchor="${anchor}" font-family="ui-monospace, monospace" font-size="10.5" fill="#111">${esc(text)}</text>`
  );
}

parts.push(
  `<text x="24" y="${H - 8}" font-family="ui-monospace, monospace" font-size="10" fill="#888">Source: data/windows.json and results/scores.json. Bars absent by design; each point is one model.</text>`
);
parts.push(`</svg>`);

fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(OUT_SVG, parts.join("\n") + "\n");
console.log(`wrote ${OUT_SVG} (${rows.length} models)`);
