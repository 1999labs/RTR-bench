# Learn the Room

Model: z-ai/glm-5.3-flash

development; limited pilot; incomplete. Evidence budget: 3; seed: 7.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | not available | 2 / 0 / 3 / 0 | 0 | 5 | 13 | 1270 | 11 | 0.000238 | 11 |
| random | not available | 0 / 0 / 0 / 5 | 3 | 1 | 1 | 0 | 1 | 0.000000 | 1 |
| similar | not available | 0 / 0 / 0 / 5 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |
| agent | not available | 0 / 0 / 0 / 5 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |

Uniform baseline: 85.831 / 100. Constant reference baseline: 85.682 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
