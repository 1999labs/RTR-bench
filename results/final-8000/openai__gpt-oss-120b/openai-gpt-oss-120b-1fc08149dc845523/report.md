# Learn the Room

Model: openai/gpt-oss-120b

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.525 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 26913 | 0 | 0.002908 | 0 |
| random | 86.765 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 44332 | 0 | 0.004263 | 0 |
| similar | 85.639 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 44576 | 0 | 0.004330 | 0 |
| agent | 82.841 | 45 / 0 / 0 / 0 | 78 | 284 | 288 | 525659 | 4 | 0.032644 | 4 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 0.240 | -2.603 to 3.055 |
| similar vs none | -0.886 | -4.509 to 2.392 |
| agent vs none | -3.684 | -8.056 to 0.285 |
| agent vs random | -3.924 | -8.106 to -0.055 |
| agent vs similar | -2.798 | -6.550 to 0.745 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
