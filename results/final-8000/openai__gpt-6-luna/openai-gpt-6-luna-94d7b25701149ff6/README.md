# gpt-6-luna — final evaluation

Provider: **OpenAI (Flex)**, requested route `openai`. Actual response providers: OpenAI. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 85.99226007 | +0.43 | 44/45 | 80.86 to 89.76 | $0.00286 |
| Random examples | 83.79519993 | −1.76 | 43/45 | 76.98 to 89.10 | $0.00557 |
| Similar examples | 85.31099858 | −0.25 | 44/45 | 79.71 to 89.68 | $0.00565 |
| Learn | 82.74807126 | −2.81 | 44/45 | 77.32 to 87.38 | $0.01475 |

Learn Gain: **−3.24** points; paired exploratory 95% interval **−8.46 to 1.48**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

175/180 valid final predictions; 372 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 40.49 minutes, including retries and pauses. Known total cost including controls: $0.0288283775; ledger accounted: $0.028828433; unresolved charges: 0.

Terminal failures remain in the denominator with score zero; they were not rerolled:

- none, day 168 (BIG TOBACCO): invalid — Shares must sum to one within 0.001 (probability sum: 0.98).
- random, day 137 (NOSTALGIA): invalid — Shares must sum to one within 0.001 (probability sum: 0.98).
- random, day 142 (ONSHORING): invalid — Shares must sum to one within 0.001 (probability sum: 0.99).
- similar, day 162 (GRETA THUNBERG): invalid — Shares must sum to one within 0.001 (probability sum: 0.99).
- agent, day 174 (GOOGLE): invalid — Shares must sum to one within 0.001 (probability sum: 1.02).

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
