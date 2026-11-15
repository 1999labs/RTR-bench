# deepseek-v4.1-flash-1017 final evaluation — 8,000 tokens

Provider: Sail Research (`sail-research/fp4/us`, fp4). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | vs baseline (points) | Valid / 45 | 95% score interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Historical-average baseline | 85.56 | 0.00 | — | — | — |
| Predict | 74.81725902 | −10.74 | 38/45 | 64.93 to 83.79 | ≥$0.0228571855 |
| Random examples | 62.20354214 | −23.35 | 31/45 | 49.40 to 73.99 | ≥$0.0286401031 |
| Similar examples | 64.98243948 | −20.58 | 33/45 | 52.64 to 76.43 | ≥$0.0273151303 |
| Learn | 86.74674526 | +1.19 | 45/45 | 83.32 to 90.13 | ≥$0.0261351421 |

The historical-average baseline predicts the same distribution for every target, calculated only from reference windows. Uniform prediction scores 85.39. Differences use unrounded scores; failed terminal answers retain zero points. Learn gain measures the overall workflow difference, including answer-completion differences.

Learn gain: 11.92948624 points; exploratory paired 95% interval [2.428821818523353, 22.766831994932044]. Total reported cost: ≥$0.1049475610, including controls; 369 HTTP attempts; 102.53 minutes including provider backoff and the scheduling pause.

147/180 final predictions were valid. There were 11 API/transport errors and 33 length stops across attempts. The ledger records 0 unbilled rate-limit rejections and 12 unknown-cost reservations. The reported-cost total is separate from the ledger's conservatively rounded accounting total ($1.030345096).

The cost figures are lower bounds. Eleven provider TTFT-guard rejections and one HTTP 200 response with no usage data retain $0.925397364 in conservative reservations. The ledger total includes these reservations; it is not an invoice. The [budget amendment](../../budget-amendment.md) explains the preserved partial history and provider pause.

All 33 failed final predictions were empty responses: 32 had a length stop, and one similarity-control response (day 166) was an HTTP 200 body containing only whitespace, with no usage data. Seven failures occurred in Predict, fourteen in random, and twelve in similar. Learn recovered from one intermediate length stop, and every Learn episode produced a valid final prediction. Learn gain therefore reflects both distribution agreement and the difference in final-answer completion rates.

Final failed episodes (retained at zero points):

- none day 130: missing — Missing final model response
- none day 149: missing — Missing final model response
- none day 157: missing — Missing final model response
- none day 158: missing — Missing final model response
- none day 168: missing — Missing final model response
- none day 171: missing — Missing final model response
- none day 173: missing — Missing final model response
- random day 131: missing — Missing final model response
- random day 144: missing — Missing final model response
- random day 146: missing — Missing final model response
- random day 149: missing — Missing final model response
- random day 150: missing — Missing final model response
- random day 154: missing — Missing final model response
- random day 155: missing — Missing final model response
- random day 160: missing — Missing final model response
- random day 162: missing — Missing final model response
- random day 170: missing — Missing final model response
- random day 171: missing — Missing final model response
- random day 172: missing — Missing final model response
- random day 173: missing — Missing final model response
- random day 174: missing — Missing final model response
- similar day 137: missing — Missing final model response
- similar day 142: missing — Missing final model response
- similar day 149: missing — Missing final model response
- similar day 154: missing — Missing final model response
- similar day 158: missing — Missing final model response
- similar day 160: missing — Missing final model response
- similar day 161: missing — Missing final model response
- similar day 163: missing — Missing final model response
- similar day 166: missing — Missing final model response
- similar day 169: missing — Missing final model response
- similar day 170: missing — Missing final model response
- similar day 171: missing — Missing final model response

Failures were not rerolled. Learn may recover from malformed or empty actions through its existing bounded feedback loop; a valid final prediction does not imply that every intermediate response succeeded.

The verifier independently recomputed scores, replayed requests and traces, reconciled the ledger, and resumed with network calls disabled without changing the report. Scores measure distribution agreement, not percentage accuracy. Intervals are exploratory and do not capture all model/service variation.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
