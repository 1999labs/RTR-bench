# Learn the Room

Model: minimax/minimax-m3.1-flash

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.953 | 45 / 0 / 0 / 0 | 0 | 45 | 48 | 71029 | 3 | 0.017482 | 3 |
| random | 83.138 | 44 / 0 / 1 / 0 | 135 | 45 | 51 | 81699 | 6 | 0.017992 | 6 |
| similar | 81.675 | 43 / 0 / 2 / 0 | 135 | 45 | 47 | 81813 | 2 | 0.018058 | 2 |
| agent | 84.242 | 45 / 0 / 0 / 0 | 135 | 231 | 242 | 542761 | 11 | 0.063446 | 11 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -3.815 | -9.726 to 0.587 |
| similar vs none | -5.278 | -12.244 to 0.310 |
| agent vs none | -2.711 | -6.132 to 0.592 |
| agent vs random | 1.104 | -4.798 to 7.850 |
| agent vs similar | 2.568 | -3.226 to 9.657 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
