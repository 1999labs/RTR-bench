# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.909 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 23840 | 0 | 0.001605 | 0 |
| random | 86.209 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 45426 | 0 | 0.002808 | 0 |
| similar | 86.831 | 30 / 0 / 0 / 0 | 90 | 30 | 31 | 43939 | 1 | 0.002716 | 1 |
| agent | 84.532 | 30 / 0 / 0 / 0 | 86 | 146 | 146 | 253456 | 0 | 0.010599 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.701 | -3.581 to 0.432 |
| similar vs none | -1.078 | -4.206 to 2.038 |
| agent vs none | -3.377 | -6.560 to -0.079 |
| agent vs random | -1.677 | -4.887 to 1.773 |
| agent vs similar | -2.299 | -6.099 to 1.769 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
