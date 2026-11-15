# minimax-m3.1-flash — final evaluation

Provider: **Inferact vLLM (nvfp4)**, requested route `inferact-vllm/nvfp4`. Actual response providers: Inferact vLLM. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.95313994 | +1.40 | 45/45 | 84.60 to 89.13 | $0.01748 |
| Random examples | 83.13784686 | −2.42 | 44/45 | 77.45 to 87.58 | $0.01799 |
| Similar examples | 81.67465450 | −3.88 | 43/45 | 74.92 to 87.42 | $0.01806 |
| Learn | 84.24219982 | −1.32 | 45/45 | 80.56 to 87.66 | $0.06345 |

Learn Gain: **−2.71** points; paired exploratory 95% interval **−6.13 to 0.59**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

177/180 valid final predictions; 388 HTTP attempts, 22 API/transport errors, 9 responses stopped at the token limit. Wall-clock span: 26.69 minutes, including retries and pauses. Known total cost including controls: $0.1169776500; ledger accounted: $0.116977658; unresolved charges: 0.

Terminal failures remain in the denominator with score zero; they were not rerolled:

- random, day 157 (VANITY): missing — Missing final model response.
- similar, day 144 (SELF-DRIVING CARS): missing — Missing final model response.
- similar, day 156 (MOOD BOARDS): missing — Missing final model response.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
