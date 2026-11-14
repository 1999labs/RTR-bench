# Learn the Room

Model: minimax/minimax-m3.1-flash

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 91.678 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 3069 | 0 | 0.000666 | 0 |
| random | 56.158 | 2 / 0 / 1 / 0 | 9 | 3 | 4 | 6880 | 1 | 0.001629 | 1 |
| similar | 93.107 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 3661 | 0 | 0.000666 | 0 |
| agent | 92.244 | 3 / 0 / 0 / 0 | 9 | 15 | 16 | 31513 | 1 | 0.003083 | 1 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -35.520 | -95.134 to -2.617 |
| similar vs none | 1.429 | -3.506 to 4.524 |
| agent vs none | 0.566 | -5.081 to 4.382 |
| agent vs random | 36.086 | 3.727 to 99.516 |
| agent vs similar | -0.863 | -1.576 to -0.142 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
