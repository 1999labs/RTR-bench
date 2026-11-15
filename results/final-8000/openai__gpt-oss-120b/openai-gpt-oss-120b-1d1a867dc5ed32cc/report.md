# Learn the Room

Model: openai/gpt-oss-120b

evaluation; full partition; incomplete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Stopped: API setup failed; run remains incomplete: HTTP 404: {"message":"No endpoints found that satisfy the max price for this request","code":404,"metadata":{"routing_funnel":[{"step":"Initial Endpoints","endpoint_count":26}],"failed_routing_step":"Filter by Max Price"}}

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | not available | 0 / 0 / 0 / 45 | 0 | 1 | 1 | 0 | 1 | 0.000000 | 1 |
| random | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |
| similar | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |
| agent | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
