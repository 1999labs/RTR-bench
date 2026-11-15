# Learn the Room

Model: anthropic/claude-haiku-5.5

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Temperature: provider default (endpoint does not support temperature control); this differs from temperature-zero runs.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.350 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 21891 | 0 | 0.005042 | 0 |
| random | 87.441 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 40556 | 0 | 0.007832 | 0 |
| similar | 87.217 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 39683 | 0 | 0.007458 | 0 |
| agent | 86.792 | 45 / 0 / 0 / 0 | 77 | 170 | 170 | 447774 | 0 | 0.059253 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 1.091 | -1.069 to 3.389 |
| similar vs none | 0.867 | -1.475 to 3.241 |
| agent vs none | 0.442 | -1.930 to 2.868 |
| agent vs random | -0.649 | -2.988 to 1.737 |
| agent vs similar | -0.425 | -2.570 to 1.667 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
