# mimo-v2.6-flash final evaluation — 8,000 tokens

Provider: Xiaomi (`xiaomi/fp8`, fp8). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | Valid / 45 | Reported cost |
|---|---:|---:|---:|
| none | 86.97924213 | 45 | $0.0038963400 |
| random | 85.35181413 | 45 | $0.0068636960 |
| similar | 86.25270268 | 45 | $0.0071202656 |
| agent | 83.52752702 | 45 | $0.0221740736 |

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
