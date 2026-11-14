# Learn the Room

Model: thinkingmachines/inkling-small

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 93.491 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 1369 | 0 | 0.001128 | 0 |
| random | 93.679 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2753 | 0 | 0.002056 | 0 |
| similar | 96.390 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2757 | 0 | 0.002071 | 0 |
| agent | 93.527 | 3 / 0 / 0 / 0 | 8 | 15 | 15 | 24709 | 0 | 0.007801 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 0.189 | -2.735 to 2.038 |
| similar vs none | 2.900 | 2.259 to 3.229 |
| agent vs none | 0.036 | -4.427 to 3.175 |
| agent vs random | -0.152 | -1.692 to 1.137 |
| agent vs similar | -2.863 | -7.638 to -0.053 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
