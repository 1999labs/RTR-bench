# Learn the Room

Model: xiaomi/mimo-v2.6-flash

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 91.337 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 1197 | 0 | 0.000240 | 0 |
| random | 92.372 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2774 | 0 | 0.000457 | 0 |
| similar | 91.915 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 2476 | 0 | 0.000378 | 0 |
| agent | 92.231 | 3 / 0 / 0 / 0 | 8 | 14 | 14 | 23487 | 0 | 0.001432 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 1.035 | -3.886 to 5.852 |
| similar vs none | 0.578 | -14.103 to 14.251 |
| agent vs none | 0.894 | -6.505 to 7.818 |
| agent vs random | -0.141 | -7.645 to 5.255 |
| agent vs similar | 0.316 | -6.433 to 7.598 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
