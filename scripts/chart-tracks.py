# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib>=3.9,<4"]
# ///
"""Plot the declared final results. Run: uv run scripts/chart-tracks.py

Per-condition cost excludes comparison controls and other experiments.
The historical dominant-quadrant figure is maintained by chart.mjs.
"""
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator

ROOT = Path(__file__).resolve().parents[1]
# Deliberate publication list: never mix development runs or silently select a best repeat.
RUNS = ["results/learn-room/z-ai-glm-5-3-flash-e9d0327447ef1856/report.json"]
records = []
protocol = None
for source in RUNS:
    raw = (ROOT / source).read_bytes()
    report = json.loads(raw)
    c = report["manifest"]["config"]
    assert report["complete"] and c["mode"] == "api" and c["partition"] == "evaluation"
    assert c["targets"] == list(range(130, 175))
    signature = {k: c[k] for k in ["datasetHash", "splitHash", "targets", "reference", "scorerVersion", "agentPromptHash", "budget", "maxActions", "maxModelCalls"]}
    signature["generation"] = {k: c["settings"][k] for k in ["temperature", "maxTokens"]}
    if protocol is None:
        protocol = signature
    assert signature == protocol, "Chart rows must use matching targets and protocol"
    summaries = {s["strategy"]: s for s in report["summaries"]}
    points = []
    for strategy, label in [("none", "Predict"), ("agent", "Learn")]:
        s = summaries[strategy]
        assert s["complete"] and s["pending"] == 0 and s["costUsd"]["unknownAttempts"] == 0
        assert s["costUsd"]["known"] > 0 and 0 <= s["score"] <= 100
        points.append({"track": label, "score": s["score"], "costUsd": s["costUsd"]["known"], "scoreCI": s["scoreCI"]})
    comparison = next(p for p in report["comparisons"] if p["strategy"] == "agent" and p["control"] == "none")
    assert abs(points[1]["score"] - points[0]["score"] - comparison["scoreGain"]) < 1e-10
    records.append({"source": source, "sourceSha256": hashlib.sha256(raw).hexdigest(), "model": c["model"], "provider": c["spending"]["providerTag"], "agentPolicy": c["agentPolicy"], "points": points, "gain": comparison["scoreGain"], "gainCI": comparison["scoreGainCI"], "baselines": report["baselines"]})

plt.rcParams.update({"font.family": "DejaVu Sans Mono", "font.size": 11, "svg.hashsalt": "rtr-predict-learn-v1"})
fig, ax = plt.subplots(figsize=(12, 6.4), dpi=150)
fig.subplots_adjust(left=.09, right=.96, top=.80, bottom=.23)
fig.suptitle("RTR-bench · Predict and Learn", y=.96, fontsize=20)
fig.text(.5, .885, "45 final targets · scores out of 100 · lower cost and higher score are better", ha="center", fontsize=10)
ax.set_xscale("log")
costs = [p["costUsd"] for r in records for p in r["points"]]
ax.set_xlim(min(costs) / 2, max(costs) * 2)
intervals = [p["scoreCI"] for r in records for p in r["points"]]
ax.set_ylim(min(80, min(ci[0] for ci in intervals) - 2), max(95, max(ci[1] for ci in intervals) + 2))
ax.xaxis.set_major_locator(FixedLocator(costs))
ax.xaxis.set_major_formatter(FuncFormatter(lambda value, _: f"${value:.5f}"))
ax.xaxis.set_minor_locator(NullLocator())
ax.grid(axis="y", color="#eeeeee")
ax.spines[["top", "right"]].set_visible(False)
colors = plt.get_cmap("tab10")
for i, r in enumerate(records):
    predict, learn = r["points"]
    color = colors(i)
    ax.annotate("", xy=(learn["costUsd"], learn["score"]), xytext=(predict["costUsd"], predict["score"]), arrowprops={"arrowstyle": "->", "color": color, "lw": 1.6, "alpha": .65})
    for p, marker in [(predict, "o"), (learn, "s")]:
        lo, hi = p["scoreCI"]
        ax.errorbar(p["costUsd"], p["score"], yerr=[[p["score"] - lo], [hi - p["score"]]], fmt=marker, color=color, markersize=9, capsize=5, elinewidth=1.1)
        ax.annotate(f"{p['track']} {p['score']:.2f}", xy=(p["costUsd"], hi), xytext=(0, 10), textcoords="offset points", ha="center", color=color, weight="bold")
    mid = (predict["costUsd"] * learn["costUsd"]) ** .5
    ax.text(mid, (predict["score"] + learn["score"]) / 2 + .6, f"Learn gain {r['gain']:+.2f}", ha="center", color=color, fontsize=10)
    fig.text(.5, .835 - i*.025, f"{r['model']} · {r['provider']} · {r['agentPolicy']}", ha="center", fontsize=10)

baseline = records[0]["baselines"]
ax.axhline(baseline["constantScore"], color="#777777", ls="--", lw=1, label=f"Constant reference: {baseline['constantScore']:.2f}")
ax.axhline(baseline["uniformScore"], color="#bbbbbb", ls=":", lw=1, label=f"Uniform: {baseline['uniformScore']:.2f}")
ax.legend(loc="lower left", frameon=False, fontsize=9)
ax.set_ylabel("Distribution score / 100")
ax.set_xlabel("Cost per 45 targets (USD, log scale)", labelpad=12)
fig.text(.5, .075, "Bars: exploratory 95% target-bootstrap intervals. Scores are not percentage accuracy.", ha="center", fontsize=9)
fig.text(.5, .04, "Costs are per condition; Random and Similar controls are excluded.", ha="center", fontsize=9)
for ext in ["svg", "png"]:
    fig.savefig(ROOT / f"results/predict-learn-scatter.{ext}", metadata={"Date": None} if ext == "svg" else {})
plt.close(fig)
# Matplotlib path data may end lines with spaces; keep generated diffs clean.
svg = ROOT / "results/predict-learn-scatter.svg"
svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
(ROOT / "results/predict-learn-scatter.json").write_text(json.dumps({"matplotlibVersion": matplotlib.__version__, "protocol": protocol, "runs": records}, indent=2) + "\n")
print(f"Generated SVG, PNG, and source summary for {len(records)} declared final run(s).")
