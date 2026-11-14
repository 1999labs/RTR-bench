# Learn the Room

Model: openai/gpt-oss-120b

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 87.152 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 1183 | 0 | 0.000054 | 0 |
| random | 92.150 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2044 | 0 | 0.000086 | 0 |
| similar | 98.088 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2023 | 0 | 0.000083 | 0 |
| agent | 85.463 | 3 / 0 / 0 / 0 | 2 | 11 | 11 | 14629 | 0 | 0.000535 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 4.998 | 3.687 to 7.594 |
| similar vs none | 10.936 | 9.812 to 12.596 |
| agent vs none | -1.689 | -12.212 to 5.481 |
| agent vs random | -6.686 | -19.806 to 1.769 |
| agent vs similar | -12.625 | -24.808 to -4.920 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
