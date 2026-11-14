# GLM 5.3 Flash transfer-check policy: repeat-2

Completed all 30 development targets with all four strategies, Relace, 4,000 output tokens, and `transfer-check-v1`. All 120 predictions are valid. Final evaluation targets remain untouched.

| Strategy | Score / 100 |
|---|---:|
| No examples / direct distribution | 87.37 |
| Random examples | 84.47 |
| Similar examples | 86.05 |
| Agent | 85.68 |

The agent's gain against no examples is **-1.69 points**. Scores measure distribution error, not percentage accuracy. Interpret this run with the [three-run policy comparison](../comparisons/glm-5-3-flash-policy-repeats/README.md), which includes repeatability, regressions, limitations, and the proposed next step.

## Reliability and spending

- 234 HTTP attempts; no transport errors, length stops, or rejected agent actions.
- Reported cost: **$0.0208130316**.
- Conservative accounted cost: **$0.020813136**, below the **$0.125** run cap.
- Unknown-cost requests: **0**.
- Source commit: `4cd02f4b`. No runtime changes during execution.
- Report replays exactly from saved records; configuration and initial requests match the declared comparison.

[Interactive report](report.html) · [Metrics and traces](report.json) · [Spending ledger](spending.json)
