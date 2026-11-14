# Learn the Room

Model: z-ai/glm-5.3

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 94.902 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 885 | 0 | 0.000333 | 0 |
| random | 89.836 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 1840 | 0 | 0.000391 | 0 |
| similar | 97.388 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 1834 | 0 | 0.000391 | 0 |
| agent | 86.536 | 3 / 0 / 0 / 0 | 8 | 14 | 14 | 20986 | 0 | 0.002282 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -5.066 | -6.142 to -3.998 |
| similar vs none | 2.487 | 0.082 to 4.944 |
| agent vs none | -8.365 | -15.495 to -2.120 |
| agent vs random | -3.300 | -10.438 to 1.878 |
| agent vs similar | -10.852 | -20.439 to -2.201 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
