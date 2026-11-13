# Learn the Room

Model: z-ai/glm-5.3-flash

development; limited pilot; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 92.108 | 5 / 0 / 0 / 0 | 0 | 5 | 5 | 3810 | 0 | 0.000255 | 0 |
| random | 91.190 | 5 / 0 / 0 / 0 | 15 | 5 | 5 | 7693 | 0 | 0.000493 | 0 |
| similar | 92.996 | 5 / 0 / 0 / 0 | 15 | 5 | 5 | 6414 | 0 | 0.000396 | 0 |
| agent | 88.886 | 5 / 0 / 0 / 0 | 15 | 25 | 25 | 44034 | 0 | 0.001897 | 0 |

Uniform baseline: 85.831 / 100. Constant reference baseline: 85.682 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -0.918 | -4.548 to 2.331 |
| similar vs none | 0.889 | -5.377 to 4.470 |
| agent vs none | -3.222 | -7.490 to 0.768 |
| agent vs random | -2.304 | -7.239 to 2.625 |
| agent vs similar | -4.110 | -7.396 to -1.188 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
