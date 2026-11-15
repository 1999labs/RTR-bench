# Learn the Room

Model: z-ai/glm-5.3-flash

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.657 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 33452 | 0 | 0.002228 | 0 |
| random | 85.721 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 66249 | 0 | 0.004247 | 0 |
| similar | 85.871 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 63102 | 0 | 0.004008 | 0 |
| agent | 85.999 | 45 / 0 / 0 / 0 | 133 | 223 | 223 | 489305 | 0 | 0.023146 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.936 | -4.794 to 0.892 |
| similar vs none | -1.785 | -4.500 to 0.554 |
| agent vs none | -1.658 | -4.040 to 0.689 |
| agent vs random | 0.278 | -2.713 to 3.073 |
| agent vs similar | 0.128 | -1.779 to 2.303 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
