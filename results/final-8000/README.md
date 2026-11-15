# Selected five-model evaluation — 8,000 tokens

Status: **blocked-provider-error**. 4 of the five selected models have complete, independently verified results. Incomplete runs have no headline score.

The selected models are GLM 5.3, MiniMax M3.1 Flash, MiMo V2.6 Flash, DeepSeek V4.1 Flash 1017, and HY3. They ran sequentially. No other model was started in this campaign.

## Frozen settings

Each model uses all 45 evaluation targets (days 130–174), the same 90 historical reference windows, and four conditions: Predict (`none`), randomly chosen examples (`random`), similarity-selected examples (`similar`), and Learn (`agent`). Learn can inspect up to three examples, with eight actions/model turns. The run uses seed 7, the `transfer-check-v1` policy, an 8,000-token response allowance, three HTTP attempts per model call, and a 60-second request timeout. Reasoning uses provider defaults; temperature is zero where supported. The dataset, prompts, scorer, provider route, and quantization are frozen per manifest.

The [original plan](../../docs/final-run-plan-8000.md) proposed more models; only these five were authorized for execution. The prior GLM 5.3 Flash result in the repository used 4,000 tokens and is not a matching run from this campaign.

## Results

| Model | Track | Score / 100 | vs baseline (points) | Valid / 45 | 95% score interval | Reported track cost |
|---|---|---:|---:|---:|---|---:|
| Historical-average baseline | Both | 85.56 | 0.00 | — | — | — |
| Uniform baseline (25% each) | Both | 85.39 | −0.17 | — | — | — |
| [glm-5.3](z-ai__glm-5.3/z-ai-glm-5-3-df181956130e550d/README.md) | Predict | 86.04 | +0.48 | 44/45 | 81.23 to 89.68 | $0.00551 |
| [glm-5.3](z-ai__glm-5.3/z-ai-glm-5-3-df181956130e550d/README.md) | Learn | 82.87 | −2.69 | 44/45 | 77.64 to 87.50 | $0.03842 |
| [minimax-m3.1-flash](minimax__minimax-m3.1-flash/minimax-minimax-m3-1-flash-8985e19160d564f2/README.md) | Predict | 86.95 | +1.40 | 45/45 | 84.60 to 89.13 | $0.01748 |
| [minimax-m3.1-flash](minimax__minimax-m3.1-flash/minimax-minimax-m3-1-flash-8985e19160d564f2/README.md) | Learn | 84.24 | −1.32 | 45/45 | 80.56 to 87.66 | $0.06345 |
| [mimo-v2.6-flash](xiaomi__mimo-v2.6-flash/xiaomi-mimo-v2-6-flash-0e9297795e7f3f19/README.md) | Predict | 86.98 | +1.42 | 45/45 | 84.60 to 89.23 | $0.00390 |
| [mimo-v2.6-flash](xiaomi__mimo-v2.6-flash/xiaomi-mimo-v2-6-flash-0e9297795e7f3f19/README.md) | Learn | 83.53 | −2.03 | 45/45 | 79.73 to 87.07 | ≥$0.02217 |
| [deepseek-v4.1-flash-1017](deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d/README.md) | Predict | 74.82 | −10.74 | 38/45 | 64.93 to 83.79 | ≥$0.02286 |
| [deepseek-v4.1-flash-1017](deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d/README.md) | Learn | 86.75 | +1.19 | 45/45 | 83.32 to 90.13 | ≥$0.02614 |
| [hy3](tencent__hy3/tencent-hy3-31d8037571524f82/README.md) | Predict — incomplete | — | — | 3/45 | — | ≥$0.00252 (partial) |
| [hy3](tencent__hy3/tencent-hy3-31d8037571524f82/README.md) | Learn — not run | — | — | 0/45 | — | — |

The historical-average baseline uses only the 90 reference distributions and ignores the target prompt. Positive differences beat that baseline; negative differences trail it. Baselines are calculated predictions, not model calls, so they have no valid-answer count or API cost. Scores measure distribution agreement, not percentage accuracy. Counts are valid answers out of all 45 declared targets. HY3 has 42 Predict targets and all 45 Learn targets pending; these are not zero-scored failures.

Failed terminal predictions receive zero and stay in the score. No failed answer was rerolled. Intervals describe uncertainty across target groups, not variation across repeated model runs. Track costs exclude the random and similarity controls; the main README's Total Cost includes them.

Learn Gain remains Learn minus Predict: the overall workflow difference, not an isolated measure of learning from evidence. All point differences use unrounded values.

| Model | Learn Gain (points) | Paired 95% interval |
|---|---:|---|
| glm-5.3 | −3.17 | −9.10 to +3.09 |
| minimax-m3.1-flash | −2.71 | −6.13 to +0.59 |
| mimo-v2.6-flash | −3.45 | −6.63 to −0.45 |
| deepseek-v4.1-flash-1017 | +11.93 | +2.43 to +22.77 |

DeepSeek returned valid answers for 38/45 Predict targets and 45/45 Learn targets. Its gain includes that completion difference. The proposed [Learn-without-examples control](../../docs/predict-learn-proposal.md) has not been run; no evidence-only gain is claimed.

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
