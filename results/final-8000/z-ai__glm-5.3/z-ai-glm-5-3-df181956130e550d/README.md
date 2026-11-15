# glm-5.3 — final evaluation

Provider: **Wafer (fp4)**, requested route `wafer/us`. Actual response providers: Wafer. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.03929052 | +0.48 | 44/45 | 81.23 to 89.68 | $0.00551 |
| Random examples | 85.62695726 | +0.07 | 45/45 | 81.64 to 89.36 | $0.00669 |
| Similar examples | 87.11414688 | +1.56 | 45/45 | 83.31 to 90.60 | $0.00680 |
| Learn | 82.86617669 | −2.69 | 44/45 | 77.64 to 87.50 | $0.03842 |

Learn Gain: **−3.17** points; paired exploratory 95% interval **−9.10 to 3.09**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

178/180 valid final predictions; 356 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 4.30 minutes, including retries and pauses. Known total cost including controls: $0.0574134907; ledger accounted: $0.057413658; unresolved charges: 0.

Terminal failures remain in the denominator with score zero; they were not rerolled:

- none, day 158 (THE US CONSTITUTION): missing — Missing final model response.
- agent, day 132 (THE OLYMPICS): invalid — Expected exactly four canonical quadrant keys.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
