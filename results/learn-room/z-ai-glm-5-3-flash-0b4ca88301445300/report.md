# Learn the Room

Model: z-ai/glm-5.3-flash

development; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.366 | 30 / 0 / 0 / 0 | 0 | 30 | 30 | 22626 | 0 | 0.001510 | 0 |
| random | 84.474 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 42998 | 0 | 0.002699 | 0 |
| similar | 86.054 | 30 / 0 / 0 / 0 | 90 | 30 | 30 | 44060 | 0 | 0.002803 | 0 |
| agent | 85.677 | 30 / 0 / 0 / 0 | 84 | 144 | 144 | 303358 | 0 | 0.013801 | 0 |

Uniform baseline: 81.608 / 100. Constant reference baseline: 81.252 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -2.892 | -5.635 to -0.208 |
| similar vs none | -1.312 | -4.490 to 1.602 |
| agent vs none | -1.688 | -4.670 to 1.359 |
| agent vs random | 1.204 | -2.702 to 4.641 |
| agent vs similar | -0.377 | -3.804 to 3.247 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
