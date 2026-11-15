# Learn the Room

Model: deepseek/deepseek-v4.1-flash-1017

evaluation; full partition; incomplete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Stopped: Spending limit reached; next request was not sent

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | not available | 38 / 0 / 7 / 0 | 0 | 45 | 46 | 215231 | 1 | 0.022857 | 1 |
| random | not available | 31 / 0 / 14 / 0 | 135 | 45 | 47 | 272837 | 2 | 0.028640 | 2 |
| similar | not available | 25 / 0 / 6 / 14 | 96 | 32 | 33 | 177686 | 2 | 0.018105 | 2 |
| agent | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
