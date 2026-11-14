# 8,000-token development check — November 14, 2026

## Result

**Both models returned 12/12 valid predictions, with no truncated responses.** The check used the same development days 100–102 and all four conditions as the earlier pilot. It made 49 HTTP attempts, took approximately 4.22 minutes, and cost **$0.00999899252** in reported charges (about one cent), below the authorized **$0.30** total cap.

| Model | Valid at 4,000 | Valid at 8,000 | Maximum output tokens used at 8,000 | New reported cost |
|---|---:|---:|---:|---:|
| minimax/minimax-m3.1-flash | 11/12 | 12/12 | 2,039 | $0.00511302 |
| deepseek/deepseek-v4.1-flash-1017 | 9/12 | 12/12 | 7,665 | $0.00488597 |

All four previously failed target/condition combinations returned valid answers. Every Predict, control, and Learn prediction was usable. MiniMax encountered one temporary HTTP 429 rate limit; the existing retry policy recovered. Its ledger records that rejection as unbilled. All charges are accounted for, with no unknown reservations.

## What changed and what stayed fixed

Only the per-response output allowance changed as a generation setting: 4,000 → 8,000 tokens. The model/provider pairs, initial prompt messages, target IDs, reference pool, strategy settings, seed, agent policy, action and turn limits, temperature settings, retry rules, timeout, dataset, and scorer stayed the same. DeepSeek’s spending cap increased from the earlier pilot’s $0.10 to the newly authorized $0.15; MiniMax’s remained $0.15. Spending caps are accounting controls, not model instructions.

This check used the existing runner from commit `ac0fba8b186d0a3eaf82f969f0add8a71ea23e5a`. No application code, public CLI defaults, or final-evaluation settings were changed. The current public command default therefore remains 4,000 tokens. Both previous runs remain saved intact. No final-evaluation calls or npm publication were performed.

## Interpretation and limits

DeepSeek used **4,614 tokens** for the random-control answer on day 102 and **7,665 tokens** for the similarity-control answer on day 102. Both answers were valid, demonstrating that the extra allowance was actually used. Its longest request took about 24.7 seconds, below the unchanged 60-second timeout.

MiniMax used at most 2,039 tokens in this repeat. Its successful repeat does not prove that the larger allowance caused the improvement; hosted model outputs can vary even at temperature zero. This was one repeat on three development targets, not a randomized comparison or a guarantee that every final target will fit. These are format/completion checks, not evidence of improved prediction accuracy.

An 8,000-token allowance passed this pilot, but DeepSeek’s peak leaves only 335 tokens of headroom. Any final protocol must deliberately choose and freeze a common allowance before evaluation; do not increase it selectively after observing final failures. The earlier GLM 5.3 Flash evaluation remains valid under its recorded 4,000-token setting. A strict comparison under a newly chosen allowance would require a matching GLM run, rather than silently treating its old result as an 8,000-token result.

## Verification

The offline analyzer confirms identical non-budget configuration and initial message contents, correct spending policies, one ledger entry per HTTP attempt, and compliance with both $0.15 caps. Both completed runs resume with the network and model client disabled, reproducing their report JSON byte-for-byte without extra calls.

```bash
node results/development-token-check-8000-2026-11-14/analyze.mjs
```

- [Plan saved before execution](plan.json)
- [Execution timing and summary](execution.json)
- [Detailed comparison and verification](analysis.json)
- [Previous 4,000-token pilot](../development-preflight-2026-11-14/README.md)

Raw requests, responses, traces, manifests, spending ledgers, and reports are saved under each model directory.
