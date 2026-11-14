# Final Predict / Learn run plan — 8,000 tokens

**Prepared for approval; no final campaign calls have been made under this plan.** The campaign contains eleven models: the ten remaining models plus a new GLM 5.3 Flash run under the same 8,000-token allowance. All models run sequentially.

## Scope and fixed settings

Each model receives all 45 frozen evaluation targets (days 130–174) in four conditions: Predict, random examples, similar examples, and Learn. That is 180 final predictions per model and 1,980 across the campaign. The controls are included in the costs below.

Every run explicitly sets 8,000 output tokens per response, evidence budget 3, seed 7, maximum eight model turns, maximum eight environment actions, and policy `transfer-check-v1`. The existing three-attempt retry limit, 60-second request timeout, prompts, scoring, reference pool, and split remain unchanged. The [machine-readable plan](final-run-plan-8000.json) records the exact target/reference IDs, dataset fingerprints, provider prices, spending policies, and command arguments.

Temperature remains zero where supported; GPT-6 Luna and Claude Haiku 5.5 use their provider default because those endpoints do not support temperature control. Reasoning effort remains each provider’s default. This fixes the output allowance across models, not identical reasoning effort or compute use.

## Budget and time

The measured-use estimate is **$1.97**. The proposed individual caps total **$10.00**. Running sequentially is estimated to take **about 5.9 hours** (roughly 3,827 HTTP attempts); provider speed, retries, reasoning length, and the larger allowance can change this substantially.

| Model | Pinned provider | Precision | Estimated cost | Spending cap | Estimated minutes |
|---|---|---|---:|---:|---:|
| z-ai/glm-5.3-flash | relace/fp4 | fp4 | $0.034 | $0.25 | 30 |
| z-ai/glm-5.3 | wafer/us | fp4 | $0.051 | $0.25 | 4 |
| minimax/minimax-m3.1-flash | inferact-vllm/nvfp4 | nvfp4 | $0.096 | $0.50 | 19 |
| xiaomi/mimo-v2.6-flash | xiaomi/fp8 | fp8 | $0.070 | $0.50 | 36 |
| deepseek/deepseek-v4.1-flash-1017 | sail-research/fp4/us | fp4 | $0.101 | $0.50 | 44 |
| tencent/hy3 | gmicloud/bf16 | bf16 | $0.315 | $1.00 | 112 |
| google/gemini-3.8-flash | google-ai-studio | unknown | $0.848 | $3.50 | 27 |
| openai/gpt-6-luna | openai | unknown | $0.072 | $0.50 | 56 |
| anthropic/claude-haiku-5.5 | anthropic | unknown | $0.089 | $1.50 | 11 |
| thinkingmachines/inkling-small | deepinfra/fp4 | fp4 | $0.283 | $1.25 | 7 |
| openai/gpt-oss-120b | primeintellect/fp4 | fp4 | $0.012 | $0.25 | 7 |

Estimates reprice saved prompt and completion tokens at the refreshed base rates without cache discounts. MiniMax and DeepSeek use their 8,000-token development check. The other eight new models use their earlier 4,000-token development pilot, scaled from three to 45 targets; GLM Flash uses its earlier 45-target final run. Reasoning tokens are already included in completion usage and are not added again. There is no claim that increasing the token allowance leaves actual usage unchanged.

Each cap is three times its measured-use cost estimate plus one conservative request reservation, rounded up to the next $0.25. Reservations cover the provider’s full context allowance and 8,000 output tokens at bounded rates, including applicable text/cache tiers. That is why some inexpensive models still need relatively large caps. These are per-run limits, not a guarantee against provider billing errors or unrelated account spending. Known costs settle reservations; unknown costs retain them. A cap stop can therefore occur before the reported charges reach the cap.

The selected endpoints were listed available when this plan was prepared and advertised at least 8,000 completion tokens. Prices and availability can change. The CLI records a launch-time pricing/capability snapshot for each new run; subsequent resumes reuse that snapshot. If the endpoint becomes unavailable or prices/capabilities change materially, stop for review rather than silently changing providers, settings, or budgets.

## Why GLM is included again

The existing GLM Flash evaluation remains valid under its original 4,000-token setting. It is not a measurement under the new 8,000-token setting. This plan reruns it once so all eleven final results share the same declared allowance. The old run remains intact and linked as historical evidence. Never choose whichever of the old and new scores looks better.

The allowance change follows development compatibility observations: four one-shot predictions failed at 4,000 tokens; the authorized follow-up produced 24/24 valid predictions at 8,000. DeepSeek used up to 7,665 tokens. This is a small compatibility check, not a guarantee that all final responses will fit. Truncated, invalid, or missing final predictions retain the declared failure penalties; no selective rerolls or post-evaluation allowance changes. The evaluation data is already public and the GLM final outcomes have been seen, so this is not an untouched holdout.

## Execution after budget approval

Use the tested source checkout for this campaign. The prepared release is 0.2.1; npm still served 0.2.0 when the plan was prepared. Publishing the patch is separate from running these source commands.

From the repository folder, execute the [campaign script](https://github.com/1999labs/RTR-bench/blob/main/scripts/run-final-8000.sh):

```bash
bash scripts/run-final-8000.sh
```

This is a paid command. It runs all eleven model commands sequentially, with explicit 8,000-token settings and the caps above. It stops at the first command error. It does not automatically raise a cap, switch provider, delete attempts, or launch a replacement run. Review a stopped run before proceeding.

For example, the first command is:

```bash
node src/cli.ts read-the-room z-ai/glm-5.3-flash \
  --controls --provider relace/fp4 --split evaluation --limit 45 \
  --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 \
  --agent-policy transfer-check-v1 --max-usd 0.25 \
  --output results/final-8000/z-ai__glm-5.3-flash
```

All outputs go under `results/final-8000/`, separated by model and run fingerprint. Repeating the same script resumes completed and partial runs under the existing recovery rules; it does not reroll terminal predictions. Do not change the script’s budgets or output directories during recovery, because that can create separate paid runs. Remove a stale run lock only after confirming its process is no longer active.

Before publishing scores, replay the saved traces and scoring, inspect failed/pending targets, verify actual serving providers and settings, reconcile spending, and confirm every result in the comparison uses this protocol. Incomplete runs have no headline score. Keep the existing README results unchanged until the corresponding verified replacements are available.

## Release and compatibility checks

The prepared 0.2.1 public commands (`predict`, `learn`, and `read-the-room`) now default to 8,000 tokens. Legacy command defaults remain unchanged. Resuming an older public-command run requires an explicit `--max-tokens 4000` plus its original other settings. Tests verify that this resumes the old run while the new default creates a separate run without altering the old report. The campaign script pins the allowance explicitly so it does not depend on future default changes.

Verification passed: all 63 automated tests, package build/packing, fresh and resumed synthetic runs of all four public command variants from the extracted package, shell syntax validation, and comparison of every campaign command against the machine-readable plan. No paid calls were made during this preparation.
