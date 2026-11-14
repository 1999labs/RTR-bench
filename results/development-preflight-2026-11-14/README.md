# Development compatibility pilot — November 14, 2026

This is a setup and protocol check, not a model ranking. No final evaluation calls were made. All ten models ran sequentially on development days 100–102 with Predict, random examples, similar examples, and Learn. The tested npm archive was built from the changes committed as `3485b588` (version 0.2.1, runner v4).

## Outcome

All ten runs completed: **116 of 120 predictions were valid**, including **all 30 Learn predictions**. The pilot used **235 HTTP attempts**, took approximately **22 minutes**, and reported **$0.11486105754** in charges against per-run spending caps totaling **$3.45**. Two MiniMax rate-limit rejections had no usage object; their ledgers record the documented unbilled-rate-limit basis. No charges remain reserved as unknown. Ledger accounting rounds upward to billionths of a dollar.

| Model | Provider | Valid / 12 | HTTP attempts | Reported cost USD | Compatibility finding |
|---|---|---:|---:|---:|---|
| z-ai/glm-5.3 | wafer/us | 12 / 12 | 23 | $0.00339719 | All predictions valid; no truncation |
| minimax/minimax-m3.1-flash | inferact-vllm/nvfp4 | 11 / 12 | 26 | $0.00604368 | One random-control answer exhausted 4,000 tokens; two rate-limit errors recovered |
| xiaomi/mimo-v2.6-flash | xiaomi/fp8 | 12 / 12 | 23 | $0.00250680 | All predictions valid; no truncation |
| deepseek/deepseek-v4.1-flash-1017 | sail-research/fp4/us | 9 / 12 | 26 | $0.00529827 | One Predict and two random-control answers exhausted 4,000 tokens; Learn recovered from two further truncations |
| tencent/hy3 | gmicloud/bf16 | 12 / 12 | 23 | $0.01948710 | All predictions valid; no truncation |
| google/gemini-3.8-flash | google-ai-studio | 12 / 12 | 24 | $0.05655600 | All predictions valid; no truncation |
| openai/gpt-6-luna | openai | 12 / 12 | 24 | $0.00181593 | All predictions valid; no truncation |
| anthropic/claude-haiku-5.5 | anthropic | 12 / 12 | 22 | $0.00594180 | All predictions valid; no truncation |
| thinkingmachines/inkling-small | deepinfra/fp4 | 12 / 12 | 24 | $0.01305710 | All predictions valid; no truncation |
| openai/gpt-oss-120b | primeintellect/fp4 | 12 / 12 | 20 | $0.00075719 | All predictions valid; no truncation |

## Interpretation

Eight models passed every prediction. The four failed predictions returned no visible answer after using their full allowance on reasoning. These are output-limit failures under the declared settings, not arithmetic or data-access failures. They remain in the raw reports as missing predictions worth zero points; they were not rerolled.

Learn can recover from a malformed or empty action through its existing bounded feedback loop, while Predict has one logical response. DeepSeek therefore demonstrates why a Learn gain can include better completion reliability as well as useful evidence selection. A larger allowance should be tested on development targets before freezing the final comparison.

All ten completed runs passed offline resume verification with both the API client and global network fetch replaced by functions that throw. Each reused its original run directory and reproduced its report JSON byte-for-byte without making another model call. All target IDs, generation settings, providers, and spending caps match the predeclared plan; every attempt has a spending-ledger entry.

GPT-OSS catalog prices fell between planning and its launch: input changed from $0.037 to $0.035 per million tokens and output from $0.079 to $0.075. Its manifest freezes the lower launch-time ceilings. The other nine saved spending policies match the plan exactly. The dated plan is preserved rather than rewritten to hide this difference.

## Next experiment proposed, not executed

Test MiniMax and DeepSeek again on the same three development targets and four conditions with **8,000 output tokens**, preserving every other setting. Assign **$0.15 per model ($0.30 total)** to this separate test. The six truncated responses in this pilot took approximately 14–16 seconds each, below the current 60-second request timeout; the larger allowance still needs live validation.

If a larger allowance becomes the final protocol, record it for every model and reassess comparability with the earlier GLM 5.3 Flash evaluation. The existing GLM results remain valid under their original 4,000-token protocol; they should not silently be presented as a measurement made under the new allowance. No final protocol change or additional paid test is authorized by this document.

## Reproduce the checks

```bash
node results/development-preflight-2026-11-14/analyze.mjs
```

This validates and replays the saved completed runs with network calls disabled. It regenerates `analysis.json` and verifies that resume preserves the reports. It does not execute a new pilot.

- [Predeclared pilot plan](../../docs/development-pilot-2026-11-14.json)
- [Machine-readable verification](analysis.json)
- [Execution summary](pilot-summary.json)
- [Preflight audit](../../docs/preflight-audit.md)

Each model directory contains its manifest, spending ledger, raw attempts and traces, and complete JSON/Markdown/HTML reports. Pilot scores are intentionally not used to rank models here.
