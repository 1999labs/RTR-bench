// Report: results/scores.json -> results/leaderboard.md + results/leaderboard.svg

import fs from "node:fs";
import path from "node:path";
import { QUADRANTS } from "./prompt.ts";
import {
  loadWindows,
  scoreModel,
  majorityBaseline,
  lexicalBaseline,
  type Score,
} from "./score.ts";

const pct = (x: number) => (Number.isFinite(x) ? (100 * x).toFixed(1) + "%" : "n/a");
const ci = (c: [number, number]) => `[${pct(c[0])}, ${pct(c[1])}]`;
const round = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");

export function listRuns(): string[] {
  const dir = path.join("results", "raw");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((d) => fs.statSync(path.join(dir, d)).isDirectory())
    .sort();
}

export function buildScores() {
  const windows = loadWindows();
  const models = listRuns().filter((m) =>
    fs.existsSync(path.join("results", "raw", m, "predict"))
  );
  const scores = models.map((m) => scoreModel(m, windows));
  const majority = majorityBaseline(windows);
  const lexical = lexicalBaseline(windows);
  const out = {
    generatedAt: new Date().toISOString(),
    dataset: {
      windows: windows.length,
      marks: windows.reduce((a, w) => a + w.n, 0),
    },
    baselines: {
      random: 0.25,
      majorityClass: { quadrant: majority.label, acc: majority.acc, counts: majority.counts },
      lexical: { acc: lexical.acc, ci: lexical.ci },
    },
    scores,
    lexicalAnswers: lexical.answers,
  };
  fs.mkdirSync("results", { recursive: true });
  fs.writeFileSync("results/scores.json", JSON.stringify(out, null, 2) + "\n");
  return out;
}

export function writeReport() {
  const data = buildScores();
  const { scores, baselines, dataset } = data;
  const ranked = [...scores].sort((a, b) => b.predict.acc - a.predict.acc);

  const lines: string[] = [];
  lines.push("# RTR-bench");
  lines.push("");
  lines.push(
    `How well does a language model predict how people read a word? ${dataset.windows} windows, ${dataset.marks.toLocaleString()} marks, 4 readings, 4 option orders.`
  );
  lines.push("");
  lines.push("## Leaderboard");
  lines.push("");
  lines.push(
    "| model | score /100 | n | cost | 95% CI | axis x | axis y | Brier | own reading agrees | crowd distance | gap | unstable |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of ranked) {
    lines.push(
      `| \`${s.model}\` | **${(100 * s.predict.acc).toFixed(1)}** | ${s.windows} | $${s.costUsd.toFixed(4)} | ${ci(s.predict.ci)} | ${pct(s.axes.x)} | ${pct(s.axes.y)} | ${round(s.brier)} | ${pct(s.read.agree)} | ${round(s.crowdDistance)} | ${s.gap >= 0 ? "+" : ""}${pct(s.gap)} | ${pct(s.instability)} |`
    );
  }
  lines.push("");
  lines.push("## Baselines");
  lines.push("");
  lines.push(`- random, 4 options: 25.0%`);
  lines.push(
    `- always the most common quadrant (${baselines.majorityClass.quadrant}): ${pct(baselines.majorityClass.acc)}`
  );
  lines.push(
    `- lexical heuristic, cue list in \`src/score.ts\`: ${pct(baselines.lexical.acc)} ${ci(baselines.lexical.ci)}`
  );
  lines.push("");

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (best) {
    lines.push("## What the numbers say");
    lines.push("");
    lines.push(
      `- Best predictor: \`${best.model}\` at ${pct(best.predict.acc)} (chance 25%, majority baseline ${pct(baselines.majorityClass.acc)}).`
    );
    if (ranked.length > 1) {
      lines.push(
        `- Spread across models: ${pct(worst.predict.acc)} to ${pct(best.predict.acc)}, ${(100 * (best.predict.acc - worst.predict.acc)).toFixed(1)} points.`
      );
    } else {
      lines.push(
        `- One model only. There is no spread to report and no leaderboard ordering.`
      );
    }
    const meanGap = ranked.reduce((a, s) => a + s.gap, 0) / ranked.length;
    lines.push(
      `- Mean gap between a model's own reading and its prediction of the crowd: ${meanGap >= 0 ? "+" : ""}${pct(meanGap)}. A positive gap means the model agrees with the crowd more often when answering for itself than when trying to predict it.`
    );
    lines.push(
      `- Axis accuracy is the place to look for a systematic bias. The y axis (uniting vs dividing) and the x axis (performed vs honest) are scored separately, so a model that over-reads division shows up as high axis y and low axis x.`
    );
    lines.push("");
  }

  lines.push("## Method");
  lines.push("");
  lines.push(
    "- Two questions per word: which reading did most people choose (predict), and which reading is yours (read)."
  );
  lines.push(
    "- Four calls per question, each with the four options in a different cyclic order. The modal answer is the model's answer. A 2-2 split across orders is treated as no answer and scores zero, so the accuracy figure is a lower bound. The share of windows with no stable answer is the `unstable` column."
  );
  lines.push(
    "- Temperature 0. Prompt version and hash are written into every raw call. Confidence is used only for the Brier score."
  );
  lines.push(
    "- Confidence intervals are bootstrapped by window, 2,000 resamples. Calls within a window are not independent: the largest window contributes 1,163 marks to one question."
  );
  lines.push("");
  lines.push("## Limits");
  lines.push("");
  lines.push(
    "- The crowd is the audience of one art project on Ethereum, not humanity. It is not a representative sample of anything."
  );
  lines.push(
    "- Prompt sensitivity is real. The prompt is frozen and hashed; a reworded sentence can move scores by ten points."
  );
  lines.push(
    "- The splits are public. A model trained on this repo can score without generalising."
  );
  lines.push("");

  fs.mkdirSync("results", { recursive: true });
  fs.writeFileSync("results/leaderboard.md", lines.join("\n") + "\n");
  fs.writeFileSync("results/leaderboard.svg", svg(ranked, baselines, dataset.windows));
  console.log("wrote results/leaderboard.md and results/leaderboard.svg");
  return data;
}

export function scoreLine(s: Score): string {
  const [lo, hi] = s.predict.ci;
  return [
    s.model,
    `${(100 * s.predict.acc).toFixed(1)} / 100`,
    `${s.windows} windows`,
    `95% CI ${(100 * lo).toFixed(1)} to ${(100 * hi).toFixed(1)}`,
    `cost $${s.costUsd.toFixed(4)}`,
  ].join("   ");
}

function svg(scores: Score[], baselines: any, windowCount: number) {
  const rowH = 38;
  const top = 84;
  const left = 320;
  const w = 980;
  const h = top + rowH * scores.length + 110;
  const inner = w - left - 70;
  const scale = (v: number) => Math.max(0, Math.min(1, v)) * inner;

  const bars = scores
    .map((s, i) => {
      const y = top + i * rowH;
      const bw = scale(s.predict.acc);
      const [lo, hi] = s.predict.ci;
      const x1 = left + scale(lo);
      const x2 = left + scale(hi);
      return `
    <text x="${left - 12}" y="${y + 16}" text-anchor="end" font-family="ui-monospace, monospace" font-size="12" fill="#111">${escapeXml(
        s.model.replace(/^[^-]+-/, "")
      )}</text>
    <rect x="${left}" y="${y}" width="${inner}" height="22" fill="#f4f4f4"/>
    <rect x="${left}" y="${y}" width="${bw}" height="22" fill="#1f6feb"/>
    <line x1="${x1}" y1="${y + 11}" x2="${x2}" y2="${y + 11}" stroke="#111" stroke-width="1.5"/>
    <line x1="${x1}" y1="${y + 6}" x2="${x1}" y2="${y + 16}" stroke="#111" stroke-width="1.5"/>
    <line x1="${x2}" y1="${y + 6}" x2="${x2}" y2="${y + 16}" stroke="#111" stroke-width="1.5"/>
    <text x="${left + bw + 10}" y="${y + 16}" font-family="ui-monospace, monospace" font-size="13" fill="#111">${pct(
        s.predict.acc
      )}</text>`;
    })
    .join("");

  const line = (v: number, color: string) => {
    const x = left + scale(v);
    return `<line x1="${x}" y1="${top - 10}" x2="${x}" y2="${h - 66}" stroke="${color}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  };

  const legend = [
    { x: left, color: "#c4c4c4", label: `chance ${pct(0.25)}` },
    { x: left, color: "#6f6f6f", label: `majority ${pct(baselines.majorityClass.acc)}` },
    { x: left, color: "#b06000", label: `lexical ${pct(baselines.lexical.acc)}` },
  ];

  const legendRow = legend
    .map(
      (l, i) => `<g transform="translate(${left + i * 190}, ${h - 74})">
      <line x1="0" y1="0" x2="18" y2="0" stroke="${l.color}" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="26" y="4" font-family="ui-monospace, monospace" font-size="11" fill="#444">${l.label}</text>
    </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="24" y="32" font-family="ui-monospace, monospace" font-size="15" fill="#111">RTR-bench: can a model predict which reading a crowd chose?</text>
  <text x="24" y="52" font-family="ui-monospace, monospace" font-size="11" fill="#666">${scores.length} model${scores.length === 1 ? "" : "s"}, bars are accuracy on ${windowCount} windows</text>
  ${line(0.25, "#c4c4c4")}
  ${line(baselines.majorityClass.acc, "#6f6f6f")}
  ${line(baselines.lexical.acc, "#b06000")}
  ${bars}
  ${legendRow}
  <text x="24" y="${h - 22}" font-family="ui-monospace, monospace" font-size="11" fill="#666">whiskers: 95% CI, bootstrapped by window.</text>
</svg>
`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

if (import.meta.url === `file://${process.argv[1]}`) writeReport();
