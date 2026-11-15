# Learn the Room

Model: deepseek/deepseek-v4.1-flash-1017

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 74.817 | 38 / 0 / 7 / 0 | 0 | 45 | 46 | 215231 | 1 | 0.022857 | 1 |
| random | 62.204 | 31 / 0 / 14 / 0 | 135 | 45 | 47 | 272837 | 2 | 0.028640 | 2 |
| similar | 64.982 | 33 / 0 / 12 / 0 | 135 | 45 | 47 | 267360 | 3 | 0.027315 | 3 |
| agent | 86.747 | 45 / 0 / 0 / 0 | 132 | 223 | 229 | 521706 | 6 | 0.026135 | 6 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -12.614 | -27.005 to 1.109 |
| similar vs none | -9.835 | -23.326 to 3.171 |
| agent vs none | 11.929 | 2.429 to 22.767 |
| agent vs random | 24.543 | 13.499 to 36.979 |
| agent vs similar | 21.764 | 11.210 to 33.682 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
