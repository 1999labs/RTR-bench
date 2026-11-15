# mimo-v2.6-flash final evaluation — 8,000 tokens

Provider: Xiaomi (`xiaomi/fp8`, fp8). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | vs baseline (points) | Valid / 45 | 95% score interval | Reported cost |
|---|---:|---:|---:|---|---:|
| Historical-average baseline | 85.56 | 0.00 | — | — | — |
| Predict | 86.97924213 | +1.42 | 45/45 | 84.60 to 89.23 | $0.0038963400 |
| Random examples | 85.35181413 | −0.21 | 45/45 | 81.89 to 88.14 | $0.0068636960 |
| Similar examples | 86.25270268 | +0.70 | 45/45 | 82.95 to 89.18 | $0.0071202656 |
| Learn | 83.52752702 | −2.03 | 45/45 | 79.73 to 87.07 | ≥$0.0221740736 |

The historical-average baseline predicts the same distribution for every target, calculated only from reference windows. Uniform prediction scores 85.39. Differences use unrounded scores; failed terminal answers retain zero points. Learn gain measures the overall workflow difference, including answer-completion differences.

Learn gain: -3.45171512 points; exploratory paired 95% interval [-6.629202272622245, -0.45061918291670855]. Total reported cost: $0.0400543752, including controls; 340 HTTP attempts; 37.59 minutes.

180/180 final predictions were valid. There were 2 API/transport errors and 0 length stops across attempts. The ledger records 0 unbilled rate-limit rejections and 2 unknown-cost reservations. The reported-cost total is separate from the ledger's conservatively rounded accounting total ($0.338135717).

Two timed-out requests have unresolved charges. The reported costs above are therefore subtotals, not exact final charges; the spending ledger retains full reservations for both. Their combined reservation is $0.29808128.

Final failed episodes (retained at zero points):

None.

Failures were not rerolled. Learn may recover from malformed or empty actions through its existing bounded feedback loop; a valid final prediction does not imply that every intermediate response succeeded.

The verifier independently recomputed scores, replayed requests and traces, reconciled the ledger, and resumed with network calls disabled without changing the report. Scores measure distribution agreement, not percentage accuracy. Intervals are exploratory and do not capture all model/service variation.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
