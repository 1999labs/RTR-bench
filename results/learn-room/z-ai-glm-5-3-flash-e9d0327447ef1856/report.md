# Learn the Room

Model: z-ai/glm-5.3-flash

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.935 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 35787 | 0 | 0.002411 | 0 |
| random | 86.473 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 69077 | 0 | 0.004450 | 0 |
| similar | 85.428 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 66371 | 0 | 0.004253 | 0 |
| agent | 85.568 | 45 / 0 / 0 / 0 | 122 | 212 | 212 | 441700 | 0 | 0.020386 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.461 | -4.396 to 1.492 |
| similar vs none | -2.507 | -4.871 to -0.346 |
| agent vs none | -2.367 | -5.144 to 0.124 |
| agent vs random | -0.905 | -4.266 to 2.265 |
| agent vs similar | 0.140 | -2.391 to 2.406 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
