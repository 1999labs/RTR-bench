# Learn the Room

Model: deepseek/deepseek-v4.1-flash-1017

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 93.823 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 11003 | 0 | 0.001115 | 0 |
| random | 94.004 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 11705 | 0 | 0.001106 | 0 |
| similar | 93.425 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 16277 | 0 | 0.001601 | 0 |
| agent | 93.920 | 3 / 0 / 0 / 0 | 9 | 15 | 15 | 32598 | 0 | 0.001064 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 0.181 | -0.790 to 1.099 |
| similar vs none | -0.398 | -8.535 to 4.252 |
| agent vs none | 0.098 | -2.432 to 2.250 |
| agent vs random | -0.084 | -3.531 to 3.040 |
| agent vs similar | 0.495 | -3.777 to 6.103 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
