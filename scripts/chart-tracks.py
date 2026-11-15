# /// script
# requires-python = ">=3.10"
# dependencies = ["matplotlib>=3.9,<4", "numpy>=2,<3"]
# ///
"""Render the verified final results in the original RTR scatter style.

Run the offline analyzer first, then: uv run scripts/chart-tracks.py
An incomplete campaign can be previewed with --preview; publication requires 11.
"""
import hashlib
import json
import math
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator
from matplotlib.transforms import Bbox

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "results/final-8000/verified-results.json"
verified = json.loads(source.read_text())
assert len(verified["results"]) == 11 or "--preview" in sys.argv
assert verified["protocol"]["targets"] == list(range(130, 175))
COLORS = {
    "glm-5.3-flash": "#009E9E", "glm-5.3": "#0072B2",
    "minimax-m3.1-flash": "#D55E00", "mimo-v2.6-flash": "#228833",
    "deepseek-v4.1-flash-1017": "#8844AA", "hy3": "#CC6677",
    "gemini-3.8-flash": "#AA8800", "gpt-6-luna": "#444444",
    "claude-haiku-5.5": "#AA4499", "inkling-small": "#44AA99",
    "gpt-oss-120b": "#886633",
}
records = []
for r in verified["results"]:
    assert r["offlineResumeVerified"]
    report_path = ROOT / r["directory"] / "report.json"
    report_raw = report_path.read_bytes()
    report = json.loads(report_raw)
    assert report["complete"] and len(report["rows"]) == 180
    c = report["manifest"]["config"]
    assert c["settings"]["maxTokens"] == 8000 and c["targets"] == list(range(130, 175))
    points = []
    for strategy, label in [("none", "Predict"), ("agent", "Learn")]:
        s = next(s for s in r["summaries"] if s["strategy"] == strategy)
        original = next(s for s in report["summaries"] if s["strategy"] == strategy)
        assert s["score"] == original["score"] and s["costUsd"] == original["costUsd"]
        assert s["pending"] == 0 and s["costUsd"]["known"] > 0
        points.append({"track": label, "score": s["score"], "costUsd": s["costUsd"]["known"],
                       "costIsLowerBound": s["unknownChargeReservations"] > 0, "valid": s["valid"]})
    records.append({"model": r["model"].split("/")[-1], "provider": r["provider"],
                    "source": str(report_path.relative_to(ROOT)),
                    "sourceSha256": hashlib.sha256(report_raw).hexdigest(), "points": points})

plt.rcParams.update({"font.family": ["Menlo", "DejaVu Sans Mono"], "font.size": 7.92,
                     "svg.hashsalt": "rtr-final-predict-learn-8000", "axes.linewidth": .72,
                     "text.color": "#111111", "axes.labelcolor": "black"})
all_scores = [p["score"] for r in records for p in r["points"]]
ymin = max(0, math.floor((min(all_scores) - 3) / 5) * 5)
ymax = min(100, math.ceil((max(all_scores) + 2) / 5) * 5)

def overlap(a, b):
    return a.overlaps(b)

def label_points(ax, points, labels):
    """Place model names in display space without collisions or clipping."""
    fig = ax.figure
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    bounds = ax.get_window_extent(renderer)
    # Reserve every marker before placing any label.
    placed = [Bbox.from_bounds(*[v - 6 for v in ax.transData.transform((p["costUsd"], p["score"]))], 12, 12) for p in points]
    # Keep text clear of the colored connecting lines and Pareto steps as well.
    for line in ax.lines:
        if len(line.get_xdata()) < 2:
            continue
        vertices = line.get_transform().transform(line.get_path().vertices)
        for start, end in zip(vertices[:-1], vertices[1:]):
            steps = max(1, int(math.dist(start, end) / 6))
            for i in range(steps + 1):
                x, y = start + (end - start) * i / steps
                placed.append(Bbox.from_bounds(x - 2, y - 2, 4, 4))
    for point, label, color in sorted(labels, key=lambda x: -len(x[1])):
        x, y = point["costUsd"], point["score"]
        px, py = ax.transData.transform((x, y))
        sides = [-1, 1] if px > bounds.x0 + bounds.width * .72 else [1, -1]
        candidates = []
        for distance in [10, 22, 40, 65, 95, 130]:
            for dy in [-8, 10, -22, 24, -38, 40, -55, 58, -76, 80, -100, 105, -130, 135]:
                for side in sides:
                    t = ax.annotate(label, (x, y), xytext=(side * distance, dy), textcoords="offset points",
                                    ha="left" if side == 1 else "right", va="center", fontsize=7.56, color=color,
                                    zorder=5, annotation_clip=False)
                    box = t.get_window_extent(renderer).expanded(1.03, 1.15)
                    outside = box.x0 < bounds.x0 + 2 or box.x1 > bounds.x1 - 2 or box.y0 < bounds.y0 + 5 or box.y1 > bounds.y1 - 5
                    collisions = sum(overlap(box, b) for b in placed)
                    candidates.append((outside * 1e6 + collisions * 1e4 + distance + abs(dy), side, distance, dy, box))
                    t.remove()
        penalty, side, distance, dy, box = min(candidates, key=lambda v: v[0])
        assert penalty < 10000, f"No clear label placement for {label}; adjust canvas or placement candidates"
        placed.append(box)
        ax.annotate(label, (x, y), xytext=(side * distance, dy), textcoords="offset points",
                    ha="left" if side == 1 else "right", va="center", fontsize=7.56, color=color,
                    arrowprops={"arrowstyle": "-", "color": "#9aa7c7", "lw": .7, "shrinkA": 2, "shrinkB": 5}, zorder=5)


def draw(track, filename):
    combined = track is None
    points = [p for r in records for p in r["points"] if combined or p["track"] == track]
    costs = [p["costUsd"] for p in points]
    xmin, xmax = min(costs) * .75, max(costs) * 1.65
    fig, ax = plt.subplots(figsize=(12, 6.4), dpi=100)
    # Same 1200 x 640 canvas and margins as scripts/chart.mjs.
    fig.subplots_adjust(left=80/1200, right=1126/1200, bottom=80/640, top=566/640)
    fig.text(.5, 1-40/640, f"RTR-Bench ({'Learn + Predict' if combined else track})", ha="center", va="baseline", fontsize=14.4)
    ax.set_xscale("log")
    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ticks = [m * 10**e for e in range(-6, 4) for m in [1, 2, 5] if xmin <= m * 10**e <= xmax]
    ax.xaxis.set_major_locator(FixedLocator(ticks))
    ax.xaxis.set_minor_locator(NullLocator())
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: f"${v:.3f}" if v < .01 else f"${v:.2f}"))
    ax.yaxis.set_major_locator(FixedLocator(list(range(ymin, ymax+1, 5))))
    ax.tick_params(axis="y", length=0, pad=10)
    ax.tick_params(axis="x", length=5, pad=8)
    ax.grid(axis="y", color="#efefef", linewidth=.72)
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_ylabel("Score", fontsize=8.64, weight="bold")
    ax.yaxis.set_label_coords(-56/1046, .5)
    ax.set_xlabel("Cost per full run, log scale", fontsize=8.64, weight="bold")
    ax.xaxis.set_label_coords(.5, -.13)
    labels = []
    frontier = []
    if combined:
        # Both endpoints use squares; P/L labels identify conditions even for negative gains.
        for r in records:
            p, l = r["points"]
            color = COLORS[r["model"]]
            ax.plot([p["costUsd"], l["costUsd"]], [p["score"], l["score"]], color=color, ls=":", lw=1.4, zorder=2)
            for point in [p, l]:
                ax.plot(point["costUsd"], point["score"], "s", color=color, ms=6.5, markeredgewidth=0, zorder=4)
                labels.append((point, f"{r['model']} ({point['track'][0]})", color))
    else:
        best = -math.inf
        # At equal cost, keep only the highest score (weakly dominated points omitted).
        for p in sorted(points, key=lambda p: (p["costUsd"], -p["score"])):
            if p["score"] > best:
                frontier.append(p)
                best = p["score"]
        ax.step([p["costUsd"] for p in frontier] + [xmax], [p["score"] for p in frontier] + [frontier[-1]["score"]], where="post", color="#5555FF", lw=1.296, dashes=(6/1.8, 4/1.8), zorder=2)
        for r in records:
            p = next(p for p in r["points"] if p["track"] == track)
            ax.plot(p["costUsd"], p["score"], "s", color="#56FFFF", ms=6.5, markeredgewidth=0, zorder=4)
            labels.append((p, r["model"], "#111111"))
    label_points(ax, points, labels)
    for ext in ["svg", "png"]:
        fig.savefig(ROOT / f"results/{filename}.{ext}", dpi=200, facecolor="white", metadata={"Date": None} if ext == "svg" else {})
    plt.close(fig)
    svg = ROOT / f"results/{filename}.svg"
    svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
    return {"title": f"RTR-Bench ({'Learn + Predict' if combined else track})", "file": filename,
            "xAxis": "per-track known USD subtotal (log scale)", "yAxis": "distribution score out of 100",
            "paretoUsesKnownSubtotals": not combined, "frontier": frontier}

charts = [draw("Predict", "predict-scatter"), draw("Learn", "learn-scatter"), draw(None, "predict-learn-scatter")]
(ROOT / "results/predict-learn-scatter.json").write_text(json.dumps({"matplotlibVersion": matplotlib.__version__,
    "verifiedResultsSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "protocol": verified["protocol"],
    "costNote": "Unknown charges make some plotted costs lower bounds and the Pareto frontier provisional. Controls are excluded.",
    "runs": records, "charts": charts}, indent=2) + "\n")
print(f"Generated three SVG/PNG charts from {len(records)} verified models.")
