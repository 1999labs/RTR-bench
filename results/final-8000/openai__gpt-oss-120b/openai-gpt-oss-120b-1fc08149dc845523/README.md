# gpt-oss-120b — final evaluation

Provider: **DekaLLM (bf16)**, requested route `dekallm/bf16`. Actual response providers: DekaLLM. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.52508034 | +0.97 | 45/45 | 83.62 to 89.06 | $0.00291 |
| Random examples | 86.76509071 | +1.21 | 45/45 | 83.46 to 89.73 | $0.00426 |
| Similar examples | 85.63896522 | +0.08 | 45/45 | 81.32 to 89.31 | $0.00433 |
| Learn | 82.84109578 | −2.72 | 45/45 | 78.64 to 86.74 | ≥$0.03264 |

Learn Gain: **−3.68** points; paired exploratory 95% interval **−8.06 to 0.29**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 423 HTTP attempts, 4 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 46.59 minutes, including retries and pauses. Known total cost including controls: $0.0441451500; ledger accounted: $0.065633801; unresolved charges: 4.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
