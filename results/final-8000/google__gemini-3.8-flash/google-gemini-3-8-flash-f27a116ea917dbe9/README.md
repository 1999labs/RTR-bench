# gemini-3.8-flash — final evaluation

Provider: **Google AI Studio**, requested route `google-ai-studio`. Actual response providers: Google AI Studio. All 45 targets ran in each condition under the [campaign protocol](../../README.md).

| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Predict | 86.47655636 | +0.92 | 45/45 | 83.60 to 89.23 | $0.10883 |
| Random examples | 87.21769931 | +1.66 | 45/45 | 84.27 to 90.12 | $0.15635 |
| Similar examples | 86.57834442 | +1.02 | 45/45 | 83.35 to 89.64 | $0.15301 |
| Learn | 87.93711091 | +2.38 | 45/45 | 84.79 to 90.72 | $0.47906 |

Learn Gain: **+1.46** points; paired exploratory 95% interval **−0.69 to 3.58**. Historical-average baseline: 85.55744060; uniform baseline: 85.38589005.

180/180 valid final predictions; 364 HTTP attempts, 0 API/transport errors, 0 responses stopped at the token limit. Wall-clock span: 31.79 minutes, including retries and pauses. Known total cost including controls: $0.8972370000; ledger accounted: $0.897237007; unresolved charges: 0.

The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
- [Spending ledger](spending.json)
