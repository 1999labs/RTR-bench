# Learn the Room

Model: xiaomi/mimo-v2.6-flash

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.979 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 19045 | 0 | 0.003896 | 0 |
| random | 85.352 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 39599 | 0 | 0.006864 | 0 |
| similar | 86.253 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 39947 | 0 | 0.007120 | 0 |
| agent | 83.528 | 45 / 0 / 0 / 0 | 110 | 203 | 205 | 338655 | 2 | 0.022174 | 2 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.627 | -4.041 to 0.710 |
| similar vs none | -0.727 | -3.489 to 1.953 |
| agent vs none | -3.452 | -6.629 to -0.451 |
| agent vs random | -1.824 | -5.079 to 1.291 |
| agent vs similar | -2.725 | -6.286 to 0.747 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
