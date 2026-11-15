# minimax-m3.1-flash final evaluation — 8,000 tokens

Provider: Inferact vLLM (`inferact-vllm/nvfp4`, nvfp4). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | vs baseline (points) | Valid / 45 | 95% score interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Historical-average baseline | 85.56 | 0.00 | — | — | — |
| Predict | 86.95313994 | +1.40 | 45/45 | 84.60 to 89.13 | $0.0174819000 |
| Random examples | 83.13784686 | −2.42 | 44/45 | 77.45 to 87.58 | $0.0179921250 |
| Similar examples | 81.67465450 | −3.88 | 43/45 | 74.92 to 87.42 | $0.0180580500 |
| Learn | 84.24219982 | −1.32 | 45/45 | 80.56 to 87.66 | $0.0634455750 |

The historical-average baseline predicts the same distribution for every target, calculated only from reference windows. Uniform prediction scores 85.39. Differences use unrounded scores; failed terminal answers retain zero points. Learn gain measures the overall workflow difference, including answer-completion differences.

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
