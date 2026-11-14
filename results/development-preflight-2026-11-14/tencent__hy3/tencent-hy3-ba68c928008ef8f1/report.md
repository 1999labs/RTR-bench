# Learn the Room

Model: tencent/hy3

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 91.661 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 4812 | 0 | 0.002496 | 0 |
| random | 89.232 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 7209 | 0 | 0.003518 | 0 |
| similar | 96.027 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 7683 | 0 | 0.003800 | 0 |
| agent | 88.405 | 3 / 0 / 0 / 0 | 8 | 14 | 14 | 35829 | 0 | 0.009673 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -2.429 | -2.892 to -1.721 |
| similar vs none | 4.366 | 2.351 to 5.616 |
| agent vs none | -3.255 | -6.676 to 2.358 |
| agent vs random | -0.826 | -4.002 to 5.250 |
| agent vs similar | -7.621 | -12.292 to 0.006 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
