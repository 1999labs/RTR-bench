# GLM 5.3 Flash: first final evaluation

Completed the declared run on all **45 evaluation targets**, using GLM 5.3 Flash through Relace and the frozen `transfer-check-v1` agent policy. All **180 predictions are valid**. Direct distribution prediction scored **87.93/100**; the interactive agent scored **85.57/100**, a **-2.37-point** gain against no examples.

The point estimates show no average benefit from providing or seeking examples in this run. The agent's paired 95% interval against no examples is **-5.14 to +0.12 points**, which includes zero. This single final run does not establish a precise general effect or measure repeated-run variability.

[Interactive report](report.html) · [Full metrics and traces](report.json) · [Analysis](analysis.json) · [Frozen protocol](protocol.md) · [Manifest](manifest.json)

## Results

| Condition | Score / 100 | Target-bootstrap 95% interval | Gain vs no examples |
|---|---:|---:|---:|
| No examples / direct distribution | 87.93 | 85.76–89.94 | — |
| Random examples | 86.47 | 83.12–89.69 | -1.46 |
| Text-similar examples | 85.43 | 81.88–88.57 | -2.51 |
| Agent (`transfer-check-v1`) | 85.57 | 82.26–88.59 | -2.37 |

Scores are transformed squared distribution errors, **not percentage accuracy**. Uniform prediction scores **85.39** and the constant reference-distribution baseline scores **85.56** on this split. The agent is only about 0.01 points above the constant baseline; a mid-80s score alone should not be read as strong performance. Direct distribution is 2.38 points above that baseline.

These remain separate from the original RTR winning-quadrant benchmark. The no-example requests exactly match the direct distribution track's prediction messages, and both use the same scorer. Its 87.93 result therefore supplies the direct distribution score without another paid run or duplicated observations.

| Paired comparison | Gain | 95% interval | Targets better / worse |
|---|---:|---:|---:|
| random vs none | -1.46 | -4.40 to +1.49 | 20 / 25 |
| similar vs none | -2.51 | -4.87 to -0.35 | 16 / 29 |
| agent vs none | -2.37 | -5.14 to +0.12 | 27 / 18 |
| agent vs random | -0.91 | -4.27 to +2.27 | 24 / 21 |
| agent vs similar | +0.14 | -2.39 to +2.41 | 21 / 24 |

Intervals resample entity groups with 2,000 samples and seed 7. They are exploratory and not corrected for multiple comparisons. They measure target-sampling uncertainty, not provider variability or variation across repeated model runs. Agent selection also involves a different multi-turn instruction context and more compute than the one-shot controls, so differences do not isolate reference-selection quality.

## Why the agent can win more targets and still lose overall

The agent improves on no examples on **27 targets** and worsens on **18**. Its improvements average **+3.72 points**, while its losses average **-11.50**. The larger losses outweigh the more numerous small wins under equal-target mean scoring.

The largest observed improvements are The US Military (+11.65), Bernie Sanders (+9.38), and Honor (+6.98). The largest losses are Big Tobacco (-36.49), The Olympics (-25.04), and Jensen Huang (-20.04). These are descriptive cases selected after seeing results, not independent tests or proof of which reference caused a change. All target gains are preserved in `analysis.json`; inspect `report.html` for the corresponding evidence and predictions.

The final agent score is close to its development three-run mean of 85.67, but the targets differ. This is not a measurement of a policy effect, and the original agent policy was not rerun on the final split. The final results must not be used to tune a new prompt and then presented as a fresh held-out test on the same targets.

## Reliability and spending

- **180/180 valid predictions**: 45 per condition, no invalid, missing, or pending outputs.
- **347 HTTP attempts**, with no transport errors, retries, length stops, or rejected actions.
- Each automatic condition used 45 calls. The agent used **212 model turns** and **122 inspections**; 13 episodes submitted after two inspections, and 32 used three.
- Reported tokens across conditions: **612,935**. Usage is reported separately and does not reduce scores.
- Reported API cost: **$0.0314992195**.
- Conservative ledger accounting: **$0.031499381**, below the fresh **$0.25** cap. Unknown-cost requests: **0**.
- Recorded start/end: **2026-11-14 02:52:15–03:21:48 UTC** (November 13 local time), about 29.6 minutes.

No runtime code, prompts, selection rules, scores, or retry settings changed during the run. Completed predictions were not rerolled.

## Verification and reproducibility

The report reconstructs exactly from saved requests, responses, and action traces. Offline checks verify all 45 frozen evaluation IDs, the unchanged 90-reference pool, declared policy and limits, direct distribution message equivalence, ledger/request counts, and the spending cap. Runtime source was commit `94a00df3`; its existing 43-test suite and build had passed before these experiments. This change adds saved results and documentation, not runtime behavior.

Reproduce the analysis without API calls:

```bash
node results/learn-room/z-ai-glm-5-3-flash-e9d0327447ef1856/analyze.mjs
```

The final settings were proposed in commit `94a00df3` before execution and authorized by the user. [protocol.md](protocol.md) records that declaration and execution details. This was the first use of this split in the two new tracks, but the underlying crowd data are public; holdout from our development process does not guarantee absence from model training data.

## Current status and next step

Both new evaluation tracks now have a complete, replayable final result for one model. The protocol remains frozen; the original RTR score and default agent policy remain unchanged.

Recommended next: prepare a second-model comparison plan with a contrasting model recommendation, current provider/pricing checks, expected call count, and a proposed spending cap. Make no additional paid calls until that plan is authorized. Running another model under this same declared protocol can show whether the observed evidence-use pattern is specific to GLM; one model is not enough to generalize.
