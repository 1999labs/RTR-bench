# hy3 — final evaluation

Provider: **Tencent (fp8)**, requested route `tencent/fp8`. Actual response providers: Tencent. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.13985984 | +0.58 | 45/45 | 83.04 to 88.99 | $0.03331 |
| Random examples | 82.39022498 | −3.17 | 45/45 | 78.19 to 86.27 | $0.05840 |
| Similar examples | 86.36791619 | +0.81 | 45/45 | 82.22 to 89.87 | ≥$0.05978 |
| Learn | 83.58248476 | −1.97 | 45/45 | 79.72 to 87.06 | $0.12577 |

Learn Gain: **−2.56** points; paired exploratory 95% interval **−6.09 to 0.98**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 337 HTTP attempts, 4 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 116.06 minutes, including retries and pauses. Known total cost including controls: $0.2772601920; ledger accounted: $0.432568232; unresolved charges: 4.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
