# Learn the Room

Model: google/gemini-3.8-flash

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.477 | 45 / 0 / 0 / 0 | 0 | 45 | 45 | 36563 | 0 | 0.108827 | 0 |
| random | 87.218 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 63093 | 0 | 0.156346 | 0 |
| similar | 86.578 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 61891 | 0 | 0.153008 | 0 |
| agent | 87.937 | 45 / 0 / 0 / 0 | 135 | 229 | 229 | 387381 | 0 | 0.479056 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | 0.741 | -0.425 to 1.898 |
| similar vs none | 0.102 | -1.538 to 1.496 |
| agent vs none | 1.461 | -0.688 to 3.578 |
| agent vs random | 0.719 | -1.485 to 2.870 |
| agent vs similar | 1.359 | -0.816 to 3.572 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
