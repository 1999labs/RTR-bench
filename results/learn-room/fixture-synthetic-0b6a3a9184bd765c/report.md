# Learn the Room

**SYNTHETIC FIXTURE — not model performance.**

development; limited pilot; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 51.574 | 3 / 1 / 1 / 0 | 0 | 5 | 0 | 0 | 0 | 0.000000 | 0 |
| random | 71.314 | 4 / 0 / 1 / 0 | 15 | 5 | 0 | 0 | 0 | 0.000000 | 0 |
| similar | 71.314 | 4 / 0 / 1 / 0 | 15 | 5 | 0 | 0 | 0 | 0.000000 | 0 |
| agent | 50.609 | 3 / 1 / 1 / 0 | 5 | 23 | 0 | 0 | 0 | 0.000000 | 0 |

Uniform baseline: 85.831 / 100. Constant reference baseline: 85.682 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 19.739 | 0.000 to 58.132 |
| similar vs none | 19.739 | 0.000 to 58.132 |
| agent vs none | -0.965 | -2.167 to 0.000 |
| agent vs random | -20.704 | -58.734 to -0.363 |
| agent vs similar | -20.704 | -58.734 to -0.363 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
