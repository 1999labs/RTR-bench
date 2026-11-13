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
const xMax = Math.log10(1);

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
  `<text x="${W / 2}" y="40" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" fill="#111">RTR-bench</text>`
);

// Axes: pure black rules and numbers, faint interior grid.
for (const t of yTicks) {
  const y = yOf(t);
  parts.push(
    `<line x1="${M.left}" y1="${y.toFixed(1)}" x2="${M.left + innerW}" y2="${y.toFixed(1)}" stroke="#efefef"/>`
  );
  parts.push(
    `<text x="${M.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="ui-monospace, monospace" font-size="11" fill="#000">${t}</text>`
  );
}
parts.push(`<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${M.top + innerH}" stroke="#000"/>`);
parts.push(
  `<text transform="translate(24 ${M.top + innerH / 2}) rotate(-90)" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" font-weight="bold" fill="#000">Score</text>`
);

// X axis
parts.push(
  `<line x1="${M.left}" y1="${M.top + innerH}" x2="${M.left + innerW}" y2="${M.top + innerH}" stroke="#000"/>`
);
for (const t of xTicks) {
  const x = xOf(t);
  parts.push(
    `<line x1="${x.toFixed(1)}" y1="${M.top + innerH}" x2="${x.toFixed(1)}" y2="${M.top + innerH + 5}" stroke="#000"/>`
  );
  parts.push(
    `<text x="${x.toFixed(1)}" y="${M.top + innerH + 20}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#000">$${t.toFixed(2)}</text>`
  );
}
parts.push(
  `<text x="${M.left + innerW / 2}" y="${H - 18}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" font-weight="bold" fill="#000">Cost per full run, log scale</text>`
);

// Pareto staircase
const pts = frontier.map((r) => ({ x: xOf(r.cost), y: yOf(r.score) }));
let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
for (let i = 1; i < pts.length; i++) {
  d += ` L ${pts[i].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)} L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
}
parts.push(`<path d="${d}" fill="none" stroke="#5555FF" stroke-width="1.8" stroke-dasharray="6 4"/>`);

// Staircase segments, used to keep labels clear of the line.
const segs = [];
for (let i = 1; i < pts.length; i++) {
  segs.push([pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i - 1].y]);
  segs.push([pts[i].x, pts[i - 1].y, pts[i].x, pts[i].y]);
}
const hitsFrontier = (b, pad = 6) =>
  segs.some(([x1, y1, x2, y2]) => {
    const sx1 = Math.min(x1, x2) - pad;
    const sx2 = Math.max(x1, x2) + pad;
    const sy1 = Math.min(y1, y2) - pad;
    const sy2 = Math.max(y1, y2) + pad;
    return b.x1 < sx2 && sx1 < b.x2 && b.y1 < sy2 && sy1 < b.y2;
  });

// Every marker, so a label never lands on top of a point.
const MARKERS = byCost.map((r) => ({ x: xOf(r.cost), y: yOf(r.score) }));
const hitsMarker = (b) =>
  MARKERS.some((m) => b.x1 < m.x + 6 && m.x - 6 < b.x2 && b.y1 < m.y + 6 && m.y - 6 < b.y2);

// Points with greedy label placement.
const placed = [];
const overlaps = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

// Points sharing a score and sitting close together get a stacked fan of
// labels instead of competing for the same slot, so each label is unambiguous.
const special = new Map();
{
  const used = new Set();
  for (let i = 0; i < byCost.length; i++) {
    if (used.has(i)) continue;
    const cluster = [i];
    for (let j = i + 1; j < byCost.length; j++) {
      const a = byCost[cluster[cluster.length - 1]];
      const b = byCost[j];
      if (Math.abs(b.score - a.score) <= 1 && xOf(b.cost) - xOf(a.cost) <= 110) {
        cluster.push(j);
        used.add(j);
      }
    }
    if (cluster.length < 2) continue;
    const members = cluster.map((k) => byCost[k]);
    members
      .slice()
      .sort((a, b) => a.cost - b.cost)
      .forEach((r, k) => {
        const lx = xOf(r.cost);
        const ly = yOf(r.score) + 22 + k * 18;
        const text = shortName(r.model);
        const tw = text.length * 6.2 + 6;
        special.set(r.model, { lx, ly, text });
        placed.push({ x1: lx - tw / 2, x2: lx + tw / 2, y1: ly - 9, y2: ly + 3 });
      });
  }
}

for (const r of byCost) {
  const px = xOf(r.cost);
  const py = yOf(r.score);
  parts.push(
    `<rect x="${(px - 4.5).toFixed(1)}" y="${(py - 4.5).toFixed(1)}" width="9" height="9" fill="#56FFFF"/>`
  );

  const spec = special.get(r.model);
  if (spec) {
    parts.push(
      `<line x1="${px.toFixed(1)}" y1="${(py + 5).toFixed(1)}" x2="${spec.lx.toFixed(1)}" y2="${(spec.ly - 4).toFixed(1)}" stroke="#9aa7c7" stroke-width="0.7"/>`
    );
    parts.push(
      `<text x="${spec.lx.toFixed(1)}" y="${spec.ly.toFixed(1)}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#111">${esc(spec.text)}</text>`
    );
    continue;
  }

  const text = shortName(r.model);
  const tw = text.length * 6.2 + 6;
  const preferLeft = px > M.left + innerW * 0.72;
  const sides = preferLeft ? [-1, 1] : [1, -1];
  const dys = [-8, 8, -16, 16, -24, 24, -32, 32, -40];
  let box = null;
  let side = 1;
  outer: for (const sgn of sides) {
    for (const dy of dys) {
      const x1 = sgn > 0 ? px + 10 : px - 10 - tw;
      const cand = { x1, x2: x1 + tw, y1: py + dy - 8, y2: py + dy + 2, dy };
      if (cand.x1 < M.left + 2 || cand.x2 > W - 6) continue;
      if (hitsFrontier(cand) || hitsMarker(cand)) continue;
      if (placed.some((p) => overlaps(cand, p))) continue;
      box = cand;
      side = sgn;
      break outer;
    }
  }
  if (!box) {
    const x1 = px + 10;
    box = { x1, x2: x1 + tw, y1: py - 8, y2: py + 2, dy: -8 };
    side = 1;
  }
  placed.push(box);

  const anchor = side > 0 ? "start" : "end";
  const lx = side > 0 ? px + 10 : px - 10;
  parts.push(
    `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(py + box.dy).toFixed(1)}" stroke="#9aa7c7" stroke-width="0.7"/>`
  );
  parts.push(
    `<text x="${lx.toFixed(1)}" y="${(py + box.dy).toFixed(1)}" text-anchor="${anchor}" font-family="ui-monospace, monospace" font-size="10.5" fill="#111">${esc(text)}</text>`
  );
}

parts.push(`</svg>`);

fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(OUT_SVG, parts.join("\n") + "\n");
console.log(`wrote ${OUT_SVG} (${rows.length} models, terminus ${frontier.length})`);
