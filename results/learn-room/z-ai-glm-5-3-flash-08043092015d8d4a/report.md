# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.401 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 21638 | 0 | 0.001433 | 0 |
| random | 79.213 | 28 / 0 / 2 / 0 | 90 | 30 | 31 | 44773 | 1 | 0.002853 | 1 |
| similar | 83.178 | 30 / 0 / 0 / 0 | 90 | 30 | 31 | 44015 | 1 | 0.002807 | 1 |
| agent | 84.313 | 30 / 0 / 0 / 0 | 87 | 147 | 147 | 253857 | 0 | 0.010765 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -7.189 | -16.355 to -0.402 |
| similar vs none | -3.223 | -6.861 to 0.262 |
| agent vs none | -2.088 | -4.657 to 0.671 |
| agent vs random | 5.100 | -2.177 to 15.173 |
| agent vs similar | 1.135 | -1.868 to 4.550 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
