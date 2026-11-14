# Learn the Room

Model: google/gemini-3.8-flash

development; limited pilot; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 93.714 | 3 / 0 / 0 / 0 | 0 | 3 | 3 | 2255 | 0 | 0.006578 | 0 |
| random | 91.962 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 3961 | 0 | 0.009433 | 0 |
| similar | 93.691 | 3 / 0 / 0 / 0 | 9 | 3 | 3 | 4271 | 0 | 0.010706 | 0 |
| agent | 91.781 | 3 / 0 / 0 / 0 | 9 | 15 | 15 | 25057 | 0 | 0.029839 | 0 |

Uniform baseline: 84.349 / 100. Constant reference baseline: 85.433 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -1.753 | -4.962 to 1.500 |
| similar vs none | -0.024 | -6.194 to 3.624 |
| agent vs none | -1.933 | -5.856 to 2.703 |
| agent vs random | -0.180 | -0.894 to 1.202 |
| agent vs similar | -1.909 | -6.270 to 0.338 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
