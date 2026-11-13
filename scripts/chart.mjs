// Scatter chart for the README table: score against cost per full run.
// Reads the Results table so the chart and the table can never disagree.
// Usage: node scripts/chart.mjs  ->  results/leaderboard-scatter.svg

import fs from "node:fs";

const README = "README.md";
const OUT_SVG = "results/leaderboard-scatter.svg";

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
    if (model === "Model" || model.startsWith("---")) continue;
    const score = Number(cells[3]);
    const cost = Number(cells[4].replace("$", ""));
    if (!model || !Number.isFinite(score) || !Number.isFinite(cost)) continue;
    rows.push({ model, score, cost });
  }
  return rows;
}

function shortName(model) {
  return model
    .split("/")
    .pop()
    .replace("-1017", "")
    .replace("m3.1-flash", "m3.1")
    .replace("v2.6-flash", "v2.6")
    .replace("v4.1-flash", "v4.1")
    .replace("3.8-flash", "3.8")
    .replace("-small", "")
    .replace(/-+$/, "");
}

const rows = readTable();
if (rows.length === 0) {
  console.error("no scored rows in README Results table");
  process.exit(1);
}

// Landscape canvas with wide margins so nothing is clipped.
const W = 1200;
const H = 640;
const M = { top: 74, right: 74, bottom: 80, left: 80 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;

const yMin = 25;
const yMax = 50;
const xs = rows.map((r) => r.cost);
const xMin = Math.log10(Math.min(...xs) * 0.8);
const xMax = Math.log10(Math.max(...xs) * 2.2);

const xOf = (cost) => M.left + ((Math.log10(cost) - xMin) / (xMax - xMin)) * innerW;
const yOf = (score) => M.top + innerH - ((score - yMin) / (yMax - yMin)) * innerH;

const xTicks = [0.02, 0.05, 0.1, 0.2, 0.5, 1.0].filter(
  (t) => Math.log10(t) >= xMin && Math.log10(t) <= xMax
);
const yTicks = [25, 30, 35, 40, 45, 50];

const esc = (s) =>
  String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

let baselines = { random: 0.25, majorityClass: { acc: 0.3152 } };
try {
  const s = JSON.parse(fs.readFileSync("results/scores.json", "utf8"));
  if (s.baselines?.majorityClass) {
    baselines = { random: s.baselines.random ?? 0.25, majorityClass: s.baselines.majorityClass };
  }
} catch {}

// Pareto frontier: models no cheaper model beats on score.
const byCost = [...rows].sort((a, b) => a.cost - b.cost);
const frontier = [];
let bestScore = -Infinity;
for (const r of byCost) {
  if (r.score > bestScore) {
    frontier.push(r);
    bestScore = r.score;
  }
}

const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
parts.push(`<rect width="100%" height="100%" fill="#fff"/>`);

// Title only.
parts.push(
  `<text x="24" y="40" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" fill="#111">RTR-bench</text>`
);

// Grid and y axis
for (const t of yTicks) {
  const y = yOf(t);
  parts.push(
    `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + innerW}" y2="${y.toFixed(1)}" stroke="#efefef"/>`
  );
  parts.push(
    `<text x="${M.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="#666">${t}</text>`
  );
}
parts.push(`<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${M.top + innerH}" stroke="#9a9a9a"/>`);
parts.push(
  `<text transform="translate(24 ${M.top + innerH / 2}) rotate(-90)" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" fill="#444">Score</text>`
);

// X axis
parts.push(
  `<line x1="${M.left}" y1="${M.top + innerH}" x2="${M.left + innerW}" y2="${M.top + innerH}" stroke="#9a9a9a"/>`
);
for (const t of xTicks) {
  const x = xOf(t);
  parts.push(
    `<line x1="${x.toFixed(1)}" y1="${M.top + innerH}" x2="${x.toFixed(1)}" y2="${M.top + innerH + 5}" stroke="#9a9a9a"/>`
  );
  parts.push(
    `<text x="${x.toFixed(1)}" y="${M.top + innerH + 20}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#666">$${t.toFixed(2)}</text>`
  );
}
parts.push(
  `<text x="${M.left + innerW / 2}" y="${H - 18}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" fill="#444">Cost per full run, log scale</text>`
);

// Baselines: chance and most common.
const baselineLines = [
  { v: baselines.random * 100, color: "#cfcfcf", label: `chance ${(baselines.random * 100).toFixed(1)}` },
  {
    v: baselines.majorityClass.acc * 100,
    color: "#9a9a9a",
    label: `most common ${(baselines.majorityClass.acc * 100).toFixed(1)}`,
  },
];
for (const b of baselineLines) {
  const y = yOf(b.v);
  parts.push(
    `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + innerW}" y2="${y.toFixed(1)}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="5 4"/>`
  );
  parts.push(
    `<text x="${M.left + 6}" y="${(y - 5).toFixed(1)}" font-family="ui-monospace, monospace" font-size="9.5" fill="#8a8a8a">${esc(b.label)}</text>`
  );
}

// Pareto staircase
const pts = frontier.map((r) => ({ x: xOf(r.cost), y: yOf(r.score) }));
let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
for (let i = 1; i < pts.length; i++) {
  d += ` L ${pts[i].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)} L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
}
parts.push(`<path d="${d}" fill="none" stroke="#0f766e" stroke-width="1.6" stroke-dasharray="6 4"/>`);
for (const p of pts) {
  parts.push(
    `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="none" stroke="#0f766e" stroke-width="1.3"/>`
  );
}
const fen = pts[pts.length - 1];
const prev = pts.length > 1 ? pts[pts.length - 2] : fen;
const labelX = (prev.x + fen.x) / 2;
const labelY = prev.y - 11;
parts.push(
  `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" fill="#0f766e">pareto frontier</text>`
);

// Points with greedy label placement.
const placed = [];
const overlaps = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

for (const r of byCost) {
  const px = xOf(r.cost);
  const py = yOf(r.score);
  parts.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4.6" fill="#1f6feb"/>`);

  const text = shortName(r.model);
  const tw = text.length * 6.2 + 6;
  const leftSide = px > M.left + innerW * 0.7;
  const offsets = [-10, 16, -25, 31, -40, 46, -55, 61];
  let box = null;
  for (const dy of offsets) {
    const x1 = leftSide ? px - 11 - tw : px + 11;
    const cand = { x1, x2: x1 + tw, y1: py + dy - 9, y2: py + dy + 3, dy };
    if (cand.x1 < M.left + 2 || cand.x2 > W - 6) continue;
    if (!placed.some((p) => overlaps(cand, p))) {
      box = cand;
      break;
    }
  }
  if (!box) box = { x1: px + 11, x2: px + 11 + tw, y1: py - 9, y2: py + 3, dy: -10 };
  placed.push(box);

  const anchor = leftSide ? "end" : "start";
  const lx = leftSide ? px - 11 : px + 11;
  if (Math.abs(box.dy) > 15) {
    parts.push(
      `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(py + box.dy).toFixed(1)}" stroke="#b9c9e6" stroke-width="0.8"/>`
    );
  }
  parts.push(
    `<text x="${lx.toFixed(1)}" y="${(py + box.dy).toFixed(1)}" text-anchor="${anchor}" font-family="ui-monospace, monospace" font-size="10.5" fill="#111">${esc(text)}</text>`
  );
}

parts.push(`</svg>`);

fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(OUT_SVG, parts.join("\n") + "\n");
console.log(`wrote ${OUT_SVG} (${rows.length} models, terminus ${frontier.length})`);
