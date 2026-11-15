# Learn the Room

Model: tencent/hy3

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.140 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 70661 | 0 | 0.033310 | 0 |
| random | 82.390 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 127492 | 0 | 0.058402 | 0 |
| similar | 86.368 | 45 / 0 / 0 / 0 | 135 | 45 | 49 | 130282 | 4 | 0.059777 | 4 |
| agent | 83.582 | 45 / 0 / 0 / 0 | 108 | 198 | 198 | 503561 | 0 | 0.125771 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -3.750 | -7.785 to 0.076 |
| similar vs none | 0.228 | -2.716 to 3.161 |
| agent vs none | -2.557 | -6.088 to 0.975 |
| agent vs random | 1.192 | -3.321 to 5.469 |
| agent vs similar | -2.785 | -6.940 to 1.218 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
