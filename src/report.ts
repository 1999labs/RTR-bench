// Report: results/scores.json -> results/leaderboard.md + results/leaderboard.svg

import fs from "node:fs";
import path from "node:path";
import { QUADRANTS } from "./prompt.ts";
import { writeInterpretations } from "./interpretations.ts";
import {
  loadWindows,
  scoreModel,
  majorityBaseline,
  lexicalBaseline,
  randomBaseline,
  crowdWinners,
  SCORING_VERSION,
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
    scoringVersion: SCORING_VERSION,
    scoring: {
      crowdTarget: "All quadrants tied for the most submissions are accepted.",
      modelAggregation: "Unique modal quadrant among valid responses; vote ties have no final choice.",
      missingResponses: "Attempted windows with no valid response score zero; incomplete valid call sets retain their unique mode and are flagged separately.",
      consistency: "Four valid matching responses divided by attempted windows, separately for predict and read.",
      brierTarget: "Equal probability mass over crowd co-winners; model probability uses confidence on the selected quadrant and distributes the remainder equally.",
      tiedCrowdWindows: windows.filter((w) => crowdWinners(w).length > 1).map((w) => ({ day: w.day, word: w.word, winners: crowdWinners(w), counts: w.counts })),
    },
    generatedAt: new Date().toISOString(),
    dataset: {
      windows: windows.length,
      marks: windows.reduce((a, w) => a + w.n, 0),
    },
    baselines: {
      random: randomBaseline(windows),
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
  const historyLink = fs.existsSync("results/history/scoring-v1/scores.json") ? "history/scoring-v1/" : "https://github.com/1999labs/RTR-bench/tree/main/results/history/scoring-v1";
  lines.push(`Scoring **${data.scoringVersion}**. All crowd co-winners are accepted. Historical scoring-v1 reports are preserved in [history/scoring-v1/](${historyLink}).`);
  lines.push("");
  lines.push("## Leaderboard");
  lines.push("");
  lines.push(
    "| model | score /100 | n | cost | provider | 95% CI | axis x | axis y | Brier | own reading agrees | crowd distance | gap | unstable |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of ranked) {
    lines.push(
      `| \`${s.model}\` | **${(100 * s.predict.acc).toFixed(1)}** | ${s.windows} | $${s.costUsd.toFixed(4)} | ${providerLabel(s)} | ${ci(s.predict.ci)} | ${pct(s.axes.x)} | ${pct(s.axes.y)} | ${round(s.brier)} | ${pct(s.read.agree)} | ${round(s.crowdDistance)} | ${s.gap >= 0 ? "+" : ""}${pct(s.gap)} | ${pct(s.instability)} |`
    );
  }
  lines.push("");
  lines.push("## Consistency across option orders");
  lines.push("");
  lines.push("4/4 consistency counts four valid matching responses as a percentage of attempted windows. The other columns are window counts. Incomplete means one to three valid responses; Missing means zero. Neither is counted as 4/4 consistency. This measures consistency across reordered inputs; separating order effects from variation between identical calls requires a separate control experiment.");
  lines.push("");
  lines.push("| Model | Question | Windows | 4/4 | 3–1 | 2–1–1 | 2–2 | 1–1–1–1 | Incomplete | Missing |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const s of ranked) {
    for (const task of ["predict", "read"] as const) {
      const c = s[task].consistency;
      lines.push(`| \`${s.model}\` | ${task === "read" ? "Own reading" : "Crowd prediction"} | ${c.windows} | ${pct(c.unanimousRate)} (${c.unanimous}) | ${c.patterns["3-1"]} | ${c.patterns["2-1-1"]} | ${c.patterns["2-2"]} | ${c.patterns["1-1-1-1"]} | ${c.patterns.incomplete} | ${c.patterns.missing} |`);
    }
  }
  lines.push("");
  lines.push("See [models' own interpretations](interpretations.md) for every prompt, or open [the searchable table](interpretations.html) locally. These responses do not affect the headline score.");
  lines.push("");
  lines.push("## Baselines");
  lines.push("");
  lines.push(`- uniformly random final quadrant, accepting crowd co-winners: ${pct(baselines.random)}`);
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
      `- Best predictor: \`${best.model}\` at ${pct(best.predict.acc)} (random baseline ${pct(baselines.random)}, majority baseline ${pct(baselines.majorityClass.acc)}).`
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
      "- Axis accuracy compares each predicted axis with the crowd's marginal majority on that axis. A crowd tie on an axis is omitted from that axis metric. Directional bias needs the actual choice counts as well as accuracy."
    );
    lines.push("");
  }

  lines.push("## Method");
  lines.push("");
  lines.push(
    "- Two questions per word: which reading did most people choose (predict), and which reading is yours (read)."
  );
  lines.push(
    "- Four calls per question, each with a different cyclic option order. A unique modal answer wins: 4–0, 3–1, and 2–1–1 are resolved. A 2–2 or four-way vote tie has no final choice and scores zero. The `unstable` column counts prediction windows with a vote tie or fewer than four valid responses; it is separate from 4/4 consistency."
  );
  lines.push("- All quadrants tied for the largest crowd count are accepted for prediction accuracy and own-reading agreement. The random and constant-class baselines follow the same rule. The Brier target shares probability mass equally among crowd co-winners; unresolved or missing model answers are omitted from Brier, not from attempted-window accuracy.");
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
  writeInterpretations(loadWindows(), listRuns());
  console.log("wrote results/leaderboard.md and results/leaderboard.svg");
  return data;
}

function providerLabel(s: Score): string {
  const names = Object.keys(s.providers);
  if (names.length === 0) return "?";
  if (names.length === 1) return names[0];
  return `${names.length} providers`;
}

export function scoreLine(s: Score): string {
  const [lo, hi] = s.predict.ci;
  return [
    s.model,
    `${(100 * s.predict.acc).toFixed(1)} / 100 (scoring ${SCORING_VERSION})`,
    `${s.windows} windows`,
    `95% CI ${(100 * lo).toFixed(1)} to ${(100 * hi).toFixed(1)}`,
    `cost $${s.costUsd.toFixed(4)}`,
    `provider ${providerLabel(s)}`,
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
    { x: left, color: "#c4c4c4", label: `random ${pct(baselines.random)}` },
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
  <text x="24" y="32" font-family="ui-monospace, monospace" font-size="15" fill="#111">RTR-bench: predicting crowd readings, scoring ${SCORING_VERSION}</text>
  <text x="24" y="52" font-family="ui-monospace, monospace" font-size="11" fill="#666">${scores.length} model${scores.length === 1 ? "" : "s"}, bars are accuracy on ${windowCount} windows</text>
  ${line(baselines.random, "#c4c4c4")}
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

// Do not auto-run this module when esbuild embeds it in the CLI entry point.
if (import.meta.url.endsWith("/report.ts") && import.meta.url === `file://${process.argv[1]}`) writeReport();
