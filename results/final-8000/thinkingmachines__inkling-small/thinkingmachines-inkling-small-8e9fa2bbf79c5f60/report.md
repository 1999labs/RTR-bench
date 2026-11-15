# Learn the Room

Model: thinkingmachines/inkling-small

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.567 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 23228 | 0 | 0.020113 | 0 |
| random | 87.168 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 49297 | 0 | 0.040481 | 0 |
| similar | 88.216 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 50896 | 0 | 0.042515 | 0 |
| agent | 82.059 | 44 / 0 / 1 / 0 | 125 | 260 | 260 | 433445 | 0 | 0.126051 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 0.602 | -1.959 to 3.141 |
| similar vs none | 1.650 | -0.734 to 4.098 |
| agent vs none | -4.508 | -8.544 to -0.972 |
| agent vs random | -5.110 | -10.243 to -0.796 |
| agent vs similar | -6.157 | -11.378 to -1.637 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
