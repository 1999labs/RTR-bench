# glm-5.3-flash — final evaluation

Provider: **Relace (fp4)**, requested route `relace/fp4`. Actual response providers: Relace. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 87.65682697 | +2.10 | 45/45 | 85.15 to 89.92 | $0.00223 |
| Random examples | 85.72082690 | +0.16 | 45/45 | 82.59 to 88.74 | $0.00425 |
| Similar examples | 85.87137296 | +0.31 | 45/45 | 82.21 to 89.16 | $0.00401 |
| Learn | 85.99932573 | +0.44 | 45/45 | 82.97 to 88.82 | $0.02315 |

Learn Gain: **−1.66** points; paired exploratory 95% interval **−4.04 to 0.69**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 358 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 34.37 minutes, including retries and pauses. Known total cost including controls: $0.0336290060; ledger accounted: $0.033629175; unresolved charges: 0.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
