# Learn the Room

Model: anthropic/claude-haiku-5.5

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Temperature: provider default (endpoint does not support temperature control); this differs from temperature-zero runs.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.024 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 1536 | 0 | 0.000375 | 0 |
| random | 90.007 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2819 | 0 | 0.000580 | 0 |
| similar | 93.460 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2579 | 0 | 0.000462 | 0 |
| agent | 86.690 | 3 / 0 / 0 / 0 | 6 | 13 | 13 | 35112 | 0 | 0.004525 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 3.983 | -2.884 to 12.441 |
| similar vs none | 7.436 | 3.974 to 14.355 |
| agent vs none | 0.666 | -9.418 to 13.614 |
| agent vs random | -3.317 | -11.810 to 1.173 |
| agent vs similar | -6.770 | -13.397 to -0.741 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
