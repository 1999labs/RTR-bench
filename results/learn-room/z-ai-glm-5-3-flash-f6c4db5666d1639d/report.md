# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.030 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 23694 | 0 | 0.001594 | 0 |
| random | 83.881 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 44819 | 0 | 0.002791 | 0 |
| similar | 87.041 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 46662 | 0 | 0.002960 | 0 |
| agent | 83.720 | 30 / 0 / 0 / 0 | 89 | 149 | 149 | 263217 | 0 | 0.011164 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -3.150 | -6.143 to -0.205 |
| similar vs none | 0.010 | -2.675 to 2.724 |
| agent vs none | -3.310 | -6.076 to -0.199 |
| agent vs random | -0.161 | -3.847 to 3.984 |
| agent vs similar | -3.321 | -5.952 to -0.394 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
