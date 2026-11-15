# Learn the Room

Model: openai/gpt-6-luna

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Temperature: provider default (endpoint does not support temperature control); this differs from temperature-zero runs.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 85.992 | 44 / 1 / 0 / 0 | 0 | 45 | 45 | 19458 | 0 | 0.002858 | 0 |
| random | 83.795 | 43 / 2 / 0 / 0 | 135 | 45 | 45 | 39797 | 0 | 0.005570 | 0 |
| similar | 85.311 | 44 / 1 / 0 / 0 | 135 | 45 | 45 | 39977 | 0 | 0.005645 | 0 |
| agent | 82.748 | 44 / 1 / 0 / 0 | 135 | 237 | 237 | 365213 | 0 | 0.014755 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -2.197 | -8.995 to 4.639 |
| similar vs none | -0.681 | -6.472 to 5.337 |
| agent vs none | -3.244 | -8.463 to 1.477 |
| agent vs random | -1.047 | -7.691 to 6.228 |
| agent vs similar | -2.563 | -9.214 to 3.586 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
