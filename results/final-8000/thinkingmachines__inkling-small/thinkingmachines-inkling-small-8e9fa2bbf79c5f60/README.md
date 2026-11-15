# inkling-small — final evaluation

Provider: **DeepInfra (fp4)**, requested route `deepinfra/fp4`. Actual response providers: DeepInfra. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.56687635 | +1.01 | 45/45 | 83.46 to 89.16 | $0.02011 |
| Random examples | 87.16847270 | +1.61 | 45/45 | 83.66 to 90.23 | $0.04048 |
| Similar examples | 88.21638574 | +2.66 | 45/45 | 84.65 to 91.23 | $0.04251 |
| Learn | 82.05891678 | −3.50 | 44/45 | 76.74 to 86.51 | $0.12605 |

Learn Gain: **−4.51** points; paired exploratory 95% interval **−8.54 to −0.97**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

179/180 valid final predictions; 395 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 8.92 minutes, including retries and pauses. Known total cost including controls: $0.2291611500; ledger accounted: $0.229161153; unresolved charges: 0.

Terminal failures remain in the denominator with score zero; they were not rerolled:

- agent, day 130 (BERNIE SANDERS): missing — Action limit reached without a final prediction.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
