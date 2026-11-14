# GLM 5.3 Flash transfer-check policy: repeat-3

Completed all 30 development targets with all four strategies, Relace, 4,000 output tokens, and `transfer-check-v1`. All 120 predictions are valid. Final evaluation targets remain untouched.

| Strategy | Score / 100 |
|---|---:|
| No examples / direct distribution | 88.13 |
| Random examples | 84.53 |
| Similar examples | 85.77 |
| Agent | 85.48 |

The agent's gain against no examples is **-2.65 points**. Scores measure distribution error, not percentage accuracy. Interpret this run with the [three-run policy comparison](../comparisons/glm-5-3-flash-policy-repeats/README.md), which includes repeatability, regressions, limitations, and the proposed next step.

## Reliability and spending

- 235 HTTP attempts; no transport errors, length stops, or rejected agent actions.
- Reported cost: **$0.0213193604**.
- Conservative accounted cost: **$0.021319476**, below the **$0.125** run cap.
- Unknown-cost requests: **0**.
- Source commit: `4cd02f4b`. No runtime changes during execution.
- Report replays exactly from saved records; configuration and initial requests match the declared comparison.

[Interactive report](report.html) · [Metrics and traces](report.json) · [Spending ledger](spending.json)
