# Final Predict / Learn evaluation — eleven models

Status: **complete and independently verified**. Each model has 45 terminal outcomes in each of four conditions (180 per model). A terminal outcome can be a zero-scored failure; complete does not mean every answer was valid.

## Findings

**glm-5.3-flash led Predict at 87.66; gemini-3.8-flash led Learn at 87.94.** 10 of 11 models beat the 85.56 historical-average baseline on Predict, and 4 did on Learn. That baseline uses the same reference-derived distribution for every target; uniform predictions score 85.39. Scores in the mid-80s therefore indicate closeness to a simple baseline, not 80%-plus classification accuracy.

Learn scored lower than Predict for 8 of 11 models, so gathering examples did not consistently improve this workflow. DeepSeek's +11.93-point gain includes an answer-completion difference: 38/45 valid Predict answers versus 45/45 Learn answers. It should not be read as a pure benefit from historical evidence. These are single runs on 45 targets from one audience; small rank differences and evidence-only explanations remain uncertain.

## Results

| Model | Provider | Predict | Predict Cost | Learn | Learn Gain | Learn Cost | Total Cost |
|---|---|---:|---:|---:|---:|---:|---:|
| Historical-average baseline | No model | 85.56 | — | 85.56 | — | — | — |
| glm-5.3-flash | Relace (fp4) | 87.66<br>45/45 valid | $0.00223 | 86.00<br>45/45 valid | −1.66 | $0.02315 | $0.03363 |
| glm-5.3 | Wafer (fp4) | 86.04<br>44/45 valid | $0.00551 | 82.87<br>44/45 valid | −3.17 | $0.03842 | $0.05741 |
| minimax-m3.1-flash | Inferact vLLM (nvfp4) | 86.95<br>45/45 valid | $0.01748 | 84.24<br>45/45 valid | −2.71 | $0.06345 | $0.11698 |
| mimo-v2.6-flash | Xiaomi (fp8) | 86.98<br>45/45 valid | $0.00390 | 83.53<br>45/45 valid | −3.45 | ≥$0.02217 | ≥$0.04005 |
| deepseek-v4.1-flash-1017 | Sail Research (fp4) | 74.82<br>38/45 valid | ≥$0.02286 | 86.75<br>45/45 valid | +11.93 | ≥$0.02614 | ≥$0.10495 |
| hy3 | Tencent (fp8) | 86.14<br>45/45 valid | $0.03331 | 83.58<br>45/45 valid | −2.56 | $0.12577 | ≥$0.27726 |
| gemini-3.8-flash | Google AI Studio | 86.48<br>45/45 valid | $0.10883 | 87.94<br>45/45 valid | +1.46 | $0.47906 | $0.89724 |
| gpt-6-luna | OpenAI (Flex) | 85.99<br>44/45 valid | $0.00286 | 82.75<br>44/45 valid | −3.24 | $0.01475 | $0.02883 |
| claude-haiku-5.5 | Anthropic | 86.35<br>45/45 valid | $0.00504 | 86.79<br>45/45 valid | +0.44 | $0.05925 | $0.07958 |
| inkling-small | DeepInfra (fp4) | 86.57<br>45/45 valid | $0.02011 | 82.06<br>44/45 valid | −4.51 | $0.12605 | $0.22916 |
| gpt-oss-120b | DekaLLM (bf16) | 86.53<br>45/45 valid | $0.00291 | 82.84<br>45/45 valid | −3.68 | ≥$0.03264 | ≥$0.04415 |

Scores measure distribution agreement, not percentage accuracy. The baseline uses only reference data. Predict and Learn costs exclude controls; Total Cost includes both controls. **≥** identifies unresolved charges.

## Frozen settings

All runs use evaluation days 130–174, the same 90 historical reference windows, Predict (`none`), random examples (`random`), text-similar examples (`similar`), and Learn (`agent`). Learn may inspect three examples across eight actions and eight model turns. Settings: seed 7, `transfer-check-v1`, 8,000 output tokens per response, up to three HTTP attempts per model call, 60-second request timeout, temperature zero where supported, and provider-default reasoning. Model/provider/quantization settings are recorded below and in each manifest. Data, prompts, and scoring stayed fixed. Failures were not rerolled.

The original [plan](../../docs/final-run-plan-8000.md) and [DeepSeek budget amendment](budget-amendment.md) are preserved. The later [shared $10 plan](../../docs/final-campaign-shared-budget.json) authorized all eleven models, including a fresh GLM Flash run at 8,000 tokens and HY3 through Tencent. The earlier GLM Flash 4,000-token result and HY3 GMICloud partial run are excluded from scores but remain in campaign spending. DeepSeek’s copied partial history is counted only once.

## Target uncertainty and baselines

| Model | Track | Score | vs historical baseline | Valid / 45 | Exploratory 95% interval |
|---|---|---:|---:|---:|---|
| [glm-5.3-flash](z-ai__glm-5.3-flash/z-ai-glm-5-3-flash-a3721d86cb3fffd7/README.md) | Predict | 87.66 | +2.10 | 45/45 | 85.15 to 89.92 |
| [glm-5.3-flash](z-ai__glm-5.3-flash/z-ai-glm-5-3-flash-a3721d86cb3fffd7/README.md) | Learn | 86.00 | +0.44 | 45/45 | 82.97 to 88.82 |
| [glm-5.3](z-ai__glm-5.3/z-ai-glm-5-3-df181956130e550d/README.md) | Predict | 86.04 | +0.48 | 44/45 | 81.23 to 89.68 |
| [glm-5.3](z-ai__glm-5.3/z-ai-glm-5-3-df181956130e550d/README.md) | Learn | 82.87 | −2.69 | 44/45 | 77.64 to 87.50 |
| [minimax-m3.1-flash](minimax__minimax-m3.1-flash/minimax-minimax-m3-1-flash-8985e19160d564f2/README.md) | Predict | 86.95 | +1.40 | 45/45 | 84.60 to 89.13 |
| [minimax-m3.1-flash](minimax__minimax-m3.1-flash/minimax-minimax-m3-1-flash-8985e19160d564f2/README.md) | Learn | 84.24 | −1.32 | 45/45 | 80.56 to 87.66 |
| [mimo-v2.6-flash](xiaomi__mimo-v2.6-flash/xiaomi-mimo-v2-6-flash-0e9297795e7f3f19/README.md) | Predict | 86.98 | +1.42 | 45/45 | 84.60 to 89.23 |
| [mimo-v2.6-flash](xiaomi__mimo-v2.6-flash/xiaomi-mimo-v2-6-flash-0e9297795e7f3f19/README.md) | Learn | 83.53 | −2.03 | 45/45 | 79.73 to 87.07 |
| [deepseek-v4.1-flash-1017](deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d/README.md) | Predict | 74.82 | −10.74 | 38/45 | 64.93 to 83.79 |
| [deepseek-v4.1-flash-1017](deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d/README.md) | Learn | 86.75 | +1.19 | 45/45 | 83.32 to 90.13 |
| [hy3](tencent__hy3/tencent-hy3-ad08a72daecee623/README.md) | Predict | 86.14 | +0.58 | 45/45 | 83.04 to 88.99 |
| [hy3](tencent__hy3/tencent-hy3-ad08a72daecee623/README.md) | Learn | 83.58 | −1.97 | 45/45 | 79.72 to 87.06 |
| [gemini-3.8-flash](google__gemini-3.8-flash/google-gemini-3-8-flash-f27a116ea917dbe9/README.md) | Predict | 86.48 | +0.92 | 45/45 | 83.60 to 89.23 |
| [gemini-3.8-flash](google__gemini-3.8-flash/google-gemini-3-8-flash-f27a116ea917dbe9/README.md) | Learn | 87.94 | +2.38 | 45/45 | 84.79 to 90.72 |
| [gpt-6-luna](openai__gpt-6-luna/openai-gpt-6-luna-94d7b25701149ff6/README.md) | Predict | 85.99 | +0.43 | 44/45 | 80.86 to 89.76 |
| [gpt-6-luna](openai__gpt-6-luna/openai-gpt-6-luna-94d7b25701149ff6/README.md) | Learn | 82.75 | −2.81 | 44/45 | 77.32 to 87.38 |
| [claude-haiku-5.5](anthropic__claude-haiku-5.5/anthropic-claude-haiku-5-5-c0cc2752b65c1032/README.md) | Predict | 86.35 | +0.79 | 45/45 | 83.87 to 88.76 |
| [claude-haiku-5.5](anthropic__claude-haiku-5.5/anthropic-claude-haiku-5-5-c0cc2752b65c1032/README.md) | Learn | 86.79 | +1.23 | 45/45 | 84.20 to 89.17 |
| [inkling-small](thinkingmachines__inkling-small/thinkingmachines-inkling-small-8e9fa2bbf79c5f60/README.md) | Predict | 86.57 | +1.01 | 45/45 | 83.46 to 89.16 |
| [inkling-small](thinkingmachines__inkling-small/thinkingmachines-inkling-small-8e9fa2bbf79c5f60/README.md) | Learn | 82.06 | −3.50 | 44/45 | 76.74 to 86.51 |
| [gpt-oss-120b](openai__gpt-oss-120b/openai-gpt-oss-120b-1fc08149dc845523/README.md) | Predict | 86.53 | +0.97 | 45/45 | 83.62 to 89.06 |
| [gpt-oss-120b](openai__gpt-oss-120b/openai-gpt-oss-120b-1fc08149dc845523/README.md) | Learn | 82.84 | −2.72 | 45/45 | 78.64 to 86.74 |


| Model | Learn Gain | Paired exploratory 95% interval |
|---|---:|---|
| glm-5.3-flash | −1.66 | −4.04 to 0.69 |
| glm-5.3 | −3.17 | −9.10 to 3.09 |
| minimax-m3.1-flash | −2.71 | −6.13 to 0.59 |
| mimo-v2.6-flash | −3.45 | −6.63 to −0.45 |
| deepseek-v4.1-flash-1017 | +11.93 | 2.43 to 22.77 |
| hy3 | −2.56 | −6.09 to 0.98 |
| gemini-3.8-flash | +1.46 | −0.69 to 3.58 |
| gpt-6-luna | −3.24 | −8.46 to 1.48 |
| claude-haiku-5.5 | +0.44 | −1.93 to 2.87 |
| inkling-small | −4.51 | −8.54 to −0.97 |
| gpt-oss-120b | −3.68 | −8.06 to 0.29 |

Intervals resample matched target entity groups. They are exploratory, uncorrected for multiple comparisons, and do not measure repeated-run variability or uncertainty across independent people. Learn Gain includes selection, inference, and answer-completion differences. The ten-target [development evidence pilot](../development-evidence-pilot-v1/README.md) is separate from these final results; the larger proposed development experiment was not run.

## Costs and preserved interruptions

The entire authorized final campaign has **$1.94494979 in reported charges**, a lower bound, and **$3.47962945 accounted against the $10 ceiling**. The latter includes **27 unresolved-charge reservations totaling $1.53467884**, plus conservative ledger rounding. It is a spending-control total, not an invoice. See [exact reconciliation](campaign-accounting.json).

The failed GMICloud HY3 route stopped after three Predict targets when all allowed attempts for day 133 returned HTTP 400. The fresh Tencent run uses a separate declared identity and keeps those prior costs. Tencent advertises time-of-day prices; the cap reserves the highest advertised rate while actual usage costs come from responses. HY3 Tencent control timeouts, MiMo timeouts, and DeepSeek TTFT-guard/empty-response charges remain reserved where billing is unresolved. Explicitly unbilled MiniMax rate-limit errors are preserved without unknown-charge reservations. Provider pauses and backoff are included in wall-clock elapsed times.

Unresolved-charge counts in the published runs: mimo-v2.6-flash: 2, deepseek-v4.1-flash-1017: 12, hy3: 4, gpt-oss-120b: 4. The preserved failed HY3 GMICloud run has three additional unresolved charges. Counts and reservations remain in the exact accounting file.

GPT-OSS’s original first request was rejected because the provider’s advertised output price increased from $0.075 to $0.076 per million tokens. The [price amendment](../../docs/final-campaign-price-amendment.json) preserves that rejected request and its reservation, then starts the same model/provider/protocol with the refreshed ceiling. No prediction existed to reroll.

PrimeIntellect subsequently changed prices again after 76 terminal outcomes. The [provider amendment](../../docs/final-campaign-provider-amendment.json) preserves and excludes that partial run from final scores and uses DekaLLM (bf16), the original benchmark provider, for the full GPT-OSS evaluation. Both PrimeIntellect attempts remain in campaign spending. This was a provider-reliability decision, not selection between observed scores.

## Verification and reproduction

The [offline verifier](analyze.mjs) replays saved requests and evidence traces, independently recomputes each score from crowd counts, checks frozen configuration and all 180 outcomes, reconciles ledger entries, checks preserved DeepSeek continuation records, and resumes every completed run with network access forbidden. [Verified metrics](verified-results.json) are the sole source of the public tables and charts. No further model calls are needed to regenerate them.

```bash
node results/final-8000/analyze.mjs
uv run scripts/chart-tracks.py
python3 scripts/publish-final-results.py
```

The chart script reproduces the original cyan-square/purple-Pareto style for individual tracks and uses a distinct color per model for paired Predict/Learn points. Plot data and report hashes are saved in [chart metadata](../predict-learn-scatter.json).

- [Shared campaign execution record](shared-campaign.json)
- [Earlier five-model execution record](selected-five-execution.json)
- [DeepSeek pause](deepseek-provider-pause.json)
- [DeepSeek budget amendment](budget-amendments.json)
