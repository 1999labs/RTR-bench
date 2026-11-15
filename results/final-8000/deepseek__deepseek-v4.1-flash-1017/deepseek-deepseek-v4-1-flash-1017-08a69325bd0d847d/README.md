# deepseek-v4.1-flash-1017 — final evaluation

Provider: **Sail Research (fp4)**, requested route `sail-research/fp4/us`. Actual response providers: Sail Research. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 74.81725902 | −10.74 | 38/45 | 64.93 to 83.79 | ≥$0.02286 |
| Random examples | 62.20354214 | −23.35 | 31/45 | 49.40 to 73.99 | ≥$0.02864 |
| Similar examples | 64.98243948 | −20.58 | 33/45 | 52.64 to 76.43 | ≥$0.02732 |
| Learn | 86.74674526 | +1.19 | 45/45 | 83.32 to 90.13 | ≥$0.02614 |

Learn Gain: **+11.93** points; paired exploratory 95% interval **2.43 to 22.77**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

147/180 valid final predictions; 369 HTTP attempts, 11 API/transport errors, 33 responses stopped at the token limit. Wall-clock span: 102.53 minutes, including retries and pauses. Known total cost including controls: $0.1049475610; ledger accounted: $1.030345096; unresolved charges: 12.

Terminal failures remain in the denominator with score zero; they were not rerolled:

- none, day 130 (BERNIE SANDERS): missing — Missing final model response.
- none, day 149 (COMMITMENT): missing — Missing final model response.
- none, day 157 (VANITY): missing — Missing final model response.
- none, day 158 (THE US CONSTITUTION): missing — Missing final model response.
- none, day 168 (BIG TOBACCO): missing — Missing final model response.
- none, day 171 (ANONYMITY): missing — Missing final model response.
- none, day 173 (JENSEN HUANG): missing — Missing final model response.
- random, day 131 (WELFARE): missing — Missing final model response.
- random, day 144 (SELF-DRIVING CARS): missing — Missing final model response.
- random, day 146 (MATRIARCHIES): missing — Missing final model response.
- random, day 149 (COMMITMENT): missing — Missing final model response.
- random, day 150 (MEMORY): missing — Missing final model response.
- random, day 154 (REPUTATION): missing — Missing final model response.
- random, day 155 (CHILD PROTECTIVE SERVICES): missing — Missing final model response.
- random, day 160 (ROBOTS): missing — Missing final model response.
- random, day 162 (GRETA THUNBERG): missing — Missing final model response.
- random, day 170 (LUST): missing — Missing final model response.
- random, day 171 (ANONYMITY): missing — Missing final model response.
- random, day 172 (THE US MILITARY): missing — Missing final model response.
- random, day 173 (JENSEN HUANG): missing — Missing final model response.
- random, day 174 (GOOGLE): missing — Missing final model response.
- similar, day 137 (NOSTALGIA): missing — Missing final model response.
- similar, day 142 (ONSHORING): missing — Missing final model response.
- similar, day 149 (COMMITMENT): missing — Missing final model response.
- similar, day 154 (REPUTATION): missing — Missing final model response.
- similar, day 158 (THE US CONSTITUTION): missing — Missing final model response.
- similar, day 160 (ROBOTS): missing — Missing final model response.
- similar, day 161 (DEBT): missing — Missing final model response.
- similar, day 163 (GAME SHOWS): missing — Missing final model response.
- similar, day 166 (STEROIDS): missing — Missing final model response.
- similar, day 169 (HONOR): missing — Missing final model response.
- similar, day 170 (LUST): missing — Missing final model response.
- similar, day 171 (ANONYMITY): missing — Missing final model response.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
