# Learn the Room

Model: openai/gpt-6-luna

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Temperature: provider default (endpoint does not support temperature control); this differs from temperature-zero runs.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 92.694 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 1291 | 0 | 0.000190 | 0 |
| random | 91.706 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2547 | 0 | 0.000344 | 0 |
| similar | 94.461 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2414 | 0 | 0.000314 | 0 |
| agent | 91.804 | 3 / 0 / 0 / 0 | 9 | 15 | 15 | 23738 | 0 | 0.000968 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -0.989 | -4.952 to 1.484 |
| similar vs none | 1.766 | -4.628 to 7.427 |
| agent vs none | -0.891 | -5.491 to 2.546 |
| agent vs random | 0.098 | -1.211 to 2.045 |
| agent vs similar | -2.657 | -7.154 to 0.047 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
