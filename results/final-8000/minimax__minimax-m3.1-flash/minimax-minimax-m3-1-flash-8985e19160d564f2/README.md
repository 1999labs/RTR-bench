# minimax-m3.1-flash final evaluation — 8,000 tokens

Provider: Inferact vLLM (`inferact-vllm/nvfp4`, nvfp4). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | Valid / 45 | Reported cost |
|---|---:|---:|---:|
| none | 86.95313994 | 45 | $0.0174819000 |
| random | 83.13784686 | 44 | $0.0179921250 |
| similar | 81.67465450 | 43 | $0.0180580500 |
| agent | 84.24219982 | 45 | $0.0634455750 |

Learn gain: -2.71094012 points; exploratory paired 95% interval [-6.13168766197505, 0.5924653725976328]. Total reported cost: $0.1169776500, including controls; 388 HTTP attempts; 26.69 minutes.

177/180 final predictions were valid. There were 22 API/transport errors and 9 length stops across attempts. The ledger records 22 unbilled rate-limit rejections and 0 unknown-cost reservations. The reported-cost total is separate from the ledger's conservatively rounded accounting total ($0.116977658).

Final failed episodes (retained at zero points):

- random day 157: missing — Missing final model response
- similar day 144: missing — Missing final model response
- similar day 156: missing — Missing final model response

Failures were not rerolled. Learn may recover from malformed or empty actions through its existing bounded feedback loop; a valid final prediction does not imply that every intermediate response succeeded.

The verifier independently recomputed scores, replayed requests and traces, reconciled the ledger, and resumed with network calls disabled without changing the report. Scores measure distribution agreement, not percentage accuracy. Intervals are exploratory and do not capture all model/service variation.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
