# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.950 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 22677 | 0 | 0.001514 | 0 |
| random | 84.137 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 47348 | 0 | 0.002980 | 0 |
| similar | 85.124 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 47013 | 0 | 0.002967 | 0 |
| agent | 82.727 | 30 / 0 / 0 / 0 | 88 | 148 | 148 | 260764 | 0 | 0.011007 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -3.813 | -6.483 to -1.443 |
| similar vs none | -2.826 | -6.004 to 0.443 |
| agent vs none | -5.223 | -8.747 to -1.677 |
| agent vs random | -1.410 | -5.805 to 2.870 |
| agent vs similar | -2.397 | -6.377 to 1.668 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
