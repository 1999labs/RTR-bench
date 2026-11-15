# Learn the Room

Model: tencent/hy3

evaluation; full partition; incomplete. Evidence budget: 3; seed: 7. Agent policy: transfer-check-v1.

Stopped: API setup failed; run remains incomplete: HTTP 400: {"message":"Provider returned error","code":400,"metadata":{"raw":"{\"error\":{\"type\":\"unsupported_operation\",\"message\":\"Backend request failed with status 400\",\"backend_status\":400}}","provider_name":"GMICloud","is_byok":false}}

| Strategy | Score / 100 | Valid / invalid / missing / pending | Inspections | Model turns | API calls | Known tokens | Unknown-token attempts | Known cost USD | Unknown-cost attempts |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| none | not available | 3 / 0 / 0 / 42 | 0 | 4 | 6 | 4865 | 3 | 0.002525 | 3 |
| random | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |
| similar | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |
| agent | not available | 0 / 0 / 0 / 45 | 0 | 0 | 0 | 0 | 0 | 0.000000 | 0 |

Uniform baseline: 85.386 / 100. Constant reference baseline: 85.557 / 100.

| Comparison | Gain (points) | Paired 95% interval |
|---|---:|---|

Score uses the shared distribution scorer. Failed episodes stay in the denominator with zero points. Evidence and compute usage do not reduce scores. Model turns include simulated fixture turns; API calls count actual HTTP attempts only. Intervals resample entity groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and are exploratory on small pilots.

[Browse episode traces](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json)
