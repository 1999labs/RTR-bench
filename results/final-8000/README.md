# Selected five-model evaluation — 8,000 tokens

Status: **blocked-provider-error**. 4 of the five selected models have complete, independently verified results. Incomplete runs have no headline score.

The selected models are GLM 5.3, MiniMax M3.1 Flash, MiMo V2.6 Flash, DeepSeek V4.1 Flash 1017, and HY3. They ran sequentially. No other model was started in this campaign.

## Frozen settings

Each model uses all 45 evaluation targets (days 130–174), the same 90 historical reference windows, and four conditions: Predict (`none`), randomly chosen examples (`random`), similarity-selected examples (`similar`), and Learn (`agent`). Learn can inspect up to three examples, with eight actions/model turns. The run uses seed 7, the `transfer-check-v1` policy, an 8,000-token response allowance, three HTTP attempts per model call, and a 60-second request timeout. Reasoning uses provider defaults; temperature is zero where supported. The dataset, prompts, scorer, provider route, and quantization are frozen per manifest.

The [original plan](../../docs/final-run-plan-8000.md) proposed more models; only these five were authorized for execution. The prior GLM 5.3 Flash result in the repository used 4,000 tokens and is not a matching run from this campaign.

## Results

| Model | Provider | Predict | Learn | Learn gain | Reported total cost | Valid / 180 |
|---|---|---:|---:|---:|---:|---:|
| [glm-5.3](z-ai__glm-5.3/z-ai-glm-5-3-df181956130e550d/README.md) | Wafer (fp4) | 86.04 | 82.87 | -3.17 | $0.05741 | 178 |
| [minimax-m3.1-flash](minimax__minimax-m3.1-flash/minimax-minimax-m3-1-flash-8985e19160d564f2/README.md) | Inferact vLLM (nvfp4) | 86.95 | 84.24 | -2.71 | $0.11698 | 177 |
| [mimo-v2.6-flash](xiaomi__mimo-v2.6-flash/xiaomi-mimo-v2-6-flash-0e9297795e7f3f19/README.md) | Xiaomi (fp8) | 86.98 | 83.53 | -3.45 | ≥$0.04005 | 180 |
| [deepseek-v4.1-flash-1017](deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d/README.md) | Sail Research (fp4) | 74.82 | 86.75 | +11.93 | ≥$0.10495 | 147 |
| [hy3](tencent__hy3/tencent-hy3-31d8037571524f82/report.md) | gmicloud/bf16 | Incomplete | Incomplete | — | ≥$0.00252 (partial) | 3 (3 finished) |

Scores are out of 100 and measure distribution agreement, not percentage accuracy. Failed terminal predictions receive zero and remain in the denominator. Pending targets prevent publication of an aggregate score. Learn gain is Learn minus Predict; controls are included in total cost. No failed answer was rerolled. See the per-model reports for exploratory confidence intervals and episode-level failures.

## Costs and interruptions

The provider-reported subtotal across the five active run records is **$0.3219177769**. This is a lower bound: **17 attempts** have unresolved charges, retaining **$1.347499124** in conservative reservations. The ledger accounts for **$1.669417309** including those reservations and rounding, within the original **$2.75** combined cap. The ledger amount is a spending-control figure, not an invoice.

MiniMax explicit unbilled rate-limit rejections are retained in its attempt history but do not create unknown-charge reservations. MiMo timeout charges remain unresolved. DeepSeek retains reservations for eleven TTFT-guard rejections and one whitespace-only HTTP 200 response without usage data. HY3 retains reservations for three provider errors.

DeepSeek first stopped at its original $0.50 cap. Unused allowance from the three completed runs was reallocated to give it $1.20 while keeping HY3 at $1.00 and the combined authorized ceiling unchanged. The earlier DeepSeek partial directory is historical: its attempts and costs are already included in the active continuation and must not be counted twice. See the [budget amendment](budget-amendment.md).

DeepSeek was briefly deferred during provider backoff, with no request in flight, while HY3 ran. HY3 encountered a persistent provider error after three completed Predict episodes. DeepSeek then resumed its saved run. Elapsed run timestamps include provider backoff and this scheduling pause; they are not pure model latency.

## Verification and evidence

The [offline verifier](analyze.mjs) independently recomputes complete-run scores from the underlying distributions, checks frozen configuration and traces, reconciles spending, preserves copied DeepSeek history, and resumes completed runs with network access disabled to confirm that no saved answers are rerun. [Verified metrics](verified-results.json) contain only complete runs.

- [Execution record](selected-five-execution.json)
- [DeepSeek pause record](deepseek-provider-pause.json)
- [Machine-readable budget amendment](budget-amendments.json)

### hy3 — incomplete

All three permitted attempts for day 133 returned the same provider error. No headline score is published. The [partial-run notes](tencent__hy3/tencent-hy3-31d8037571524f82/README.md) explain why an unchanged command cannot progress beyond the exhausted retry limit.

Saved setup error: HTTP 400: {"message":"Provider returned error","code":400,"metadata":{"raw":"{\"error\":{\"type\":\"unsupported_operation\",\"message\":\"Backend request failed with status 400\",\"backend_status\":400}}","provider_name":"GMICloud","is_byok":false}}
