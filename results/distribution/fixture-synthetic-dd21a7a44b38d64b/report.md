# Distribution prediction

**SYNTHETIC FIXTURE — not model performance.**

Partition: development; limited pilot; complete.

| Measure | Value |
|---|---:|
| Score / 100 | 51.574 |
| Score 95% interval | 16.153–86.995 |
| Mean error, including failures | 0.969 |
| Valid-response mean error | 0.281 |
| Uniform baseline / 100 | 85.831 |
| Constant reference baseline / 100 | 85.682 |
| Gain over uniform, points | -34.257 |
| Gain over constant, points | -34.108 |
| Paired gain over constant 95% interval | -73.367–1.090 |
| Winning-quadrant accuracy | 25.000% |
| Valid / invalid / missing / pending | 3 / 1 / 1 / 0 |
| API calls | 0 |
| Known tokens / attempts with unknown tokens | 0 / 0 |
| Known cost USD / attempts with unknown cost | 0.000000 / 0 |

Score is 100 × (1 − mean error / 2), not percentage accuracy. Failures receive error 2. Every window has equal weight. Intervals use 2,000 entity-group bootstrap samples, seed 7, and describe variation across these targets, not uncertainty about unique people in the audience. Small pilot intervals are exploratory.

See [report.html](report.html) for predictions, counts, requests, and raw responses; [report.json](report.json) for complete metrics; [manifest.json](manifest.json) for the frozen configuration.
