# mimo-v2.6-flash — final evaluation

Provider: **Xiaomi (fp8)**, requested route `xiaomi/fp8`. Actual response providers: Xiaomi. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.97924213 | +1.42 | 45/45 | 84.60 to 89.23 | $0.00390 |
| Random examples | 85.35181413 | −0.21 | 45/45 | 81.89 to 88.14 | $0.00686 |
| Similar examples | 86.25270268 | +0.70 | 45/45 | 82.95 to 89.18 | $0.00712 |
| Learn | 83.52752702 | −2.03 | 45/45 | 79.73 to 87.07 | ≥$0.02217 |

Learn Gain: **−3.45** points; paired exploratory 95% interval **−6.63 to −0.45**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 340 HTTP attempts, 2 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 37.59 minutes, including retries and pauses. Known total cost including controls: $0.0400543752; ledger accounted: $0.338135717; unresolved charges: 2.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
