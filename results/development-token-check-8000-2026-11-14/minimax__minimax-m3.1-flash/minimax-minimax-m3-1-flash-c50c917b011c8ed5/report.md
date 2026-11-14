# Learn the Room

Model: minimax/minimax-m3.1-flash

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 91.678 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 3069 | 0 | 0.000666 | 0 |
| random | 90.358 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 5352 | 0 | 0.001118 | 0 |
| similar | 94.878 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 3960 | 0 | 0.000704 | 0 |
| agent | 90.714 | 3 / 0 / 0 / 0 | 9 | 15 | 16 | 30898 | 1 | 0.002624 | 1 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.320 | -2.708 to 0.930 |
| similar vs none | 3.200 | 0.215 to 4.787 |
| agent vs none | -0.964 | -9.604 to 4.314 |
| agent vs random | 0.356 | -7.421 to 5.105 |
| agent vs similar | -4.165 | -9.818 to -0.473 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
