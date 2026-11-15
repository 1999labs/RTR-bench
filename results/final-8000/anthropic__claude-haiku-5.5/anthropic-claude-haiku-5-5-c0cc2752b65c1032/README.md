# claude-haiku-5.5 — final evaluation

Provider: **Anthropic**, requested route `anthropic`. Actual response providers: Anthropic. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.34996950 | +0.79 | 45/45 | 83.87 to 88.76 | $0.00504 |
| Random examples | 87.44082674 | +1.88 | 45/45 | 84.82 to 90.13 | $0.00783 |
| Similar examples | 87.21660126 | +1.66 | 45/45 | 84.38 to 89.60 | $0.00746 |
| Learn | 86.79157210 | +1.23 | 45/45 | 84.20 to 89.17 | $0.05925 |

Learn Gain: **+0.44** points; paired exploratory 95% interval **−1.93 to 2.87**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 305 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 10.73 minutes, including retries and pauses. Known total cost including controls: $0.0795848000; ledger accounted: $0.079584802; unresolved charges: 0.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
