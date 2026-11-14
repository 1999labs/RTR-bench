# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.532 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 21583 | 0 | 0.001429 | 0 |
| random | 84.475 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 45344 | 0 | 0.002894 | 0 |
| similar | 86.705 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 44916 | 0 | 0.002882 | 0 |
| agent | 85.850 | 30 / 0 / 0 / 0 | 85 | 145 | 145 | 308674 | 0 | 0.014408 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -2.057 | -4.787 to 0.307 |
| similar vs none | 0.173 | -3.041 to 3.313 |
| agent vs none | -0.682 | -3.784 to 2.410 |
| agent vs random | 1.375 | -1.818 to 4.942 |
| agent vs similar | -0.855 | -4.279 to 2.405 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
