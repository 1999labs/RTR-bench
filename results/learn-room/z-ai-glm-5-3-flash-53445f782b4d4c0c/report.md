# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 88.128 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 22016 | 0 | 0.001462 | 0 |
| random | 84.529 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 44619 | 0 | 0.002806 | 0 |
| similar | 85.774 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 45522 | 0 | 0.002895 | 0 |
| agent | 85.478 | 30 / 0 / 0 / 0 | 85 | 145 | 145 | 309043 | 0 | 0.014156 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -3.599 | -6.518 to -1.054 |
| similar vs none | -2.354 | -6.186 to 1.467 |
| agent vs none | -2.650 | -5.835 to 0.520 |
| agent vs random | 0.949 | -2.990 to 4.579 |
| agent vs similar | -0.296 | -4.571 to 3.657 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
