# Learn the Room

Model: deepseek/deepseek-v4.1-flash-1017

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 64.619 | 2 / 0 / 1 / 0 | 0 | 3 | 3 | 9856 | 0 | 0.001039 | 0 |
| random | 32.158 | 1 / 0 / 2 / 0 | 9 | 3 | 3 | 12190 | 0 | 0.001261 | 0 |
| similar | 92.378 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 7287 | 0 | 0.000682 | 0 |
| agent | 90.916 | 3 / 0 / 0 / 0 | 9 | 17 | 17 | 44105 | 0 | 0.002317 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -32.462 | -95.524 to 0.000 |
| similar vs none | 27.758 | 1.151 to 77.710 |
| agent vs none | 26.296 | -6.679 to 81.328 |
| agent vs random | 58.758 | -4.817 to 99.764 |
| agent vs similar | -1.462 | -7.829 to 3.618 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
