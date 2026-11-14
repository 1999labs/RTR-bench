# Learn the Room

Model: z-ai/glm-5.3

evaluation; full partition; complete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | 86.039 | 44 / 0 / 1 / 0 | 0 | 45 | 45 | 13682 | 0 | 0.005509 | 0 |
| random | 85.627 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 28102 | 0 | 0.006687 | 0 |
| similar | 87.114 | 45 / 0 / 0 / 0 | 135 | 45 | 45 | 28040 | 0 | 0.006797 | 0 |
| agent | 82.866 | 44 / 1 / 0 / 0 | 127 | 221 | 221 | 337151 | 0 | 0.038421 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|
| random vs none | -0.412 | -4.919 to 5.026 |
| similar vs none | 1.075 | -3.027 to 5.713 |
| agent vs none | -3.173 | -9.105 to 3.094 |
| agent vs random | -2.761 | -8.140 to 1.850 |
| agent vs similar | -4.248 | -8.455 to -0.148 |

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
