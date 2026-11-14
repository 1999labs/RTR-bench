# GLM 5.3 final evaluation — 8,000 tokens

Provider: Wafer (`wafer/us`, fp4). All 45 evaluation targets were run in all four conditions under the [frozen campaign plan](../../../../docs/final-run-plan-8000.md).

| Condition | Score / 100 | Valid / 45 | Reported cost |
|---|---:|---:|---:|
| none | 86.03929052 | 44 | $0.0055093041 |
| random | 85.62695726 | 45 | $0.0066868555 |
| similar | 87.11414688 | 45 | $0.0067966905 |
| agent | 82.86617669 | 44 | $0.0384206406 |

Learn gain: -3.17311383 points; exploratory paired 95% interval [-9.104741542233242, 3.0943995588071163]. Total reported cost: $0.0574134907, including controls; 356 HTTP attempts; 4.30 minutes.

178/180 final predictions were valid. Predict day 158 returned no visible content despite HTTP 200 with a normal stop. Learn day 132 submitted a prediction with noncanonical keys. Both retain zero-point failure penalties. There were no transport/API errors or length stops. Failures were not rerolled.

The verifier independently recomputed scores, replayed requests and traces, reconciled the ledger, and resumed with network calls disabled without changing the report. Scores measure distribution agreement, not percentage accuracy. Intervals are exploratory and do not capture all service/model variation.

- [Full report](report.md)
- [Interactive traces](report.html)
- [Raw report](report.json)
- [Manifest](manifest.json)
