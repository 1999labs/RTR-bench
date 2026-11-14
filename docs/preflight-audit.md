# Predict / Learn preflight audit — November 14, 2026

## Decision

The benchmark's data separation, prediction scoring, and Learn environment passed this audit. No change to the questions, frozen split, prompts, evidence rules, or score formula is indicated. The full paid campaign should wait for a small development-only compatibility pilot using the corrected runner. Published npm version 0.2.0 does not contain these audit fixes; use the corrected checkout or publish a patch release before running.

This audit began from commit `9c6bbc108dd74b93a1cc0def70279126b7eb236a`. It used code review, mocked API failures, synthetic evaluations, public provider metadata, and replay of existing saved responses. It made no paid inference calls. Passing offline checks cannot guarantee a hosted provider's availability, output format, or future behavior.

## Problems reproduced and corrected

| Finding | Consequence before the fix | Runner v4 behavior |
|---|---|---|
| Mutable provider prices entered the run fingerprint before resume lookup | Repeating an identical command after a catalog change could create a new paid run | Looks up the saved budgeted run first and reuses its frozen pricing and capabilities |
| Authentication and billing errors were treated as final predictions | A setup problem could sweep through targets and produce a misleading zero-score completed run | Stops at the affected target, leaves the run incomplete, and permits bounded recovery |
| HTTP 200 responses could contain transient error envelopes | Retryable provider failures could become immediate benchmark failures | Classifies typed errors and embedded error codes, preserving the three-attempt limit |
| An overcharge stop did not survive reopening the ledger | Resume could send another call after a reservation had been exceeded | Blocks further requests until reviewed |
| Saved response and spending settlement were separate crash points | Known charges could remain reserved; a missing ledger could reset accounting | Links attempts to reservations, reconciles saved costs, and rejects missing or mismatched accounting |
| Completed episodes were not all validated before sending further calls | Corruption could be discovered only after more spending | Replays saved requests and traces before dispatch |
| Pinned routing did not explicitly require parameter support | A provider could silently ignore a generation setting | Sends `require_parameters: true` for new pinned runs |

These changes concern execution and accounting. They do not alter successful prediction requests' message contents, evidence selection, scoring, or output validation. The runner version changes to v4 to record the operational differences. Completed v3 budgeted runs are recognized; incomplete v3 runs require review rather than automatic migration. Arbitrarily changing output directories, budgets, strategies, or replicate IDs still creates separate runs and separate budgets.

## Data and experiment checks

- The frozen dataset contains 165 windows and 39,828 submissions. Reference has 90 windows, development 30, and evaluation 45. The loader verifies integer counts, SHA-256 fingerprints, complete disjoint coverage, chronology, and normalized prompt-group separation.
- Grouping uses trimmed, lowercased, whitespace-normalized names; the reviewed alias map is empty. Both ELON MUSK windows remain in reference. The split is chronological, not chosen from crowd outcomes.
- Predict receives the target word and task instructions, with no example or target labels. Learn can inspect only reference examples; development and evaluation labels are inaccessible through the environment's model-facing methods.
- An added test changes every non-reference crowd count and submission count, then compares all 45 targets' requests across all four conditions. It also compares Learn conversations after listing examples, inspecting three references, and submitting a prediction. The model-visible content stays identical.
- An added 180-episode synthetic evaluation exercises all 45 targets in all four conditions. An independent arithmetic calculation agrees with every aggregate score and paired gain, including invalid-output penalties.
- Existing tests cover exact probability keys, normalization tolerance, invalid and missing output, equal target weighting, tied winners, paired group bootstrap intervals, reference-only baselines, deterministic example selection, inspection limits, action limits, model-turn limits, denied actions, retries, replay, and CLI aliases.
- All 62 automated tests pass. `npm run build`, `npm pack`, and `git diff --check` pass. From the extracted package, `predict`, `learn`, `read-the-room`, and `read-the-room --controls` each pass fresh-run and resume checks outside the repository, with the correct strategies, 4,000-token default, Learn policy, and zero API calls. The audit documents are included in the package.

## Existing GLM evaluation

The completed GLM 5.3 Flash / Relace run needs no rerun because of these fixes. Its JSON, Markdown, and HTML reports reproduce exactly using the updated code. A separate calculation from the saved raw prediction JSON and original quadrant counts confirms:

| Condition | Score / 100 |
|---|---:|
| Predict (`none`) | 87.93467443347016 |
| Random examples | 86.47321119295975 |
| Similar examples | 85.42762611497108 |
| Learn (`agent`) | 85.56778927968283 |

All 180 predictions are valid. The saved attempts total 347 API calls and $0.0314992195 reported cost. Learn's paired gain over Predict is −2.36688515378733 points. Successful historical results remain comparable on the same prediction protocol; the execution-version difference should remain disclosed.

## Freeze before the campaign

Use `read-the-room --controls` so each model gets Predict, random examples, similar examples, and Learn on the same 45 evaluation targets. The original proposal used 4,000 output tokens per turn. Following the development checks below, the [final plan](final-run-plan-8000.md) supersedes that allowance with 8,000 for every model. Fix seed 7, evidence budget 3, maximum eight model turns, maximum eight environment actions, and agent policy `transfer-check-v1`. Keep one predeclared run per model/provider combination. Run models sequentially to make interruptions and per-run budget stops easy to inspect.

Record the exact model, provider tag, quantization, runner version, pricing/capability snapshot, and spending cap before each run. Include failed model outputs in the scores. Do not increase token limits or change prompts in response to final evaluation scores. Protocol changes prompted by development compatibility failures must be decided and documented before the remaining evaluation runs; assess historical comparability explicitly if such changes are needed.

The ten-provider catalog check found the planned MiMo `gmicloud/bf16` endpoint marked unavailable (`status: -2`). Its native `xiaomi/fp8` endpoint was listed available and is a candidate replacement, subject to refreshed pricing, an explicit provider/precision declaration, and a development pilot. The other nine selected endpoints were listed available; that is not proof that a paid request will succeed. See the [dated provider snapshot](preflight-providers-2026-11-14.json).

## Limits that should remain explicit

- **What Learn measures:** in-context use of historical examples, not model training or weight updates. It gets more calls and different instructions than Predict. The gain measures the whole interactive procedure. The controls help compare evidence choices but do not fully isolate the causal value of autonomous selection from extra computation.
- **Generation settings:** use temperature zero where supported. GPT-6 Luna and Claude Haiku 5.5 omit unsupported temperature and record `null`. Reasoning effort is not explicitly set; provider defaults differ. This is a comparison under a common output-token cap, not equal reasoning effort or equal compute. Reasoning can consume the allowance before visible JSON appears.
- **Evidence strength:** 45 targets and one run per model support an exploratory comparison. Bootstrap intervals describe target variation, not all variability from model sampling, participant selection, or service changes. Avoid strong rankings from small score differences or unadjusted multiple comparisons.
- **Public data:** this dataset was already public and used by the original benchmark. The split prevents runtime label leakage; it cannot establish absence from model training. The existing final GLM results also mean the evaluation set is no longer an untouched holdout for future policy development.
- **Audience:** results describe this self-selected Mixed Messages audience and historical period, not a universal correct political or cultural judgment. Chronological audience changes may affect transfer from reference examples.
- **Accounting:** unknown charges retain conservative reservations. Reservations can stop a run well below its eventual actual cost limit. Provider price ceilings and local accounting cannot control unrelated account spending or guarantee provider billing behavior.
- **Reproduction:** hosted model weights and serving implementations cannot be frozen by this repository. Exact saved responses and scores can be replayed; new API outputs need not match.

## Remaining launch checks

1. Use the corrected source checkout or prepare and publish a patch release. Preserve the existing final GLM artifacts.
2. Resolve the unavailable MiMo endpoint, refresh provider metadata and prices, and freeze the provider/precision list and individual caps. The earlier cost estimate is a planning estimate, not a guaranteed campaign price.
3. After authorizing a small separate budget, run three **development** targets per model with all four conditions. Check valid JSON, output truncation, requested settings, action handling, reported usage, and resume behavior. Do not use these few scores to rank models. This is the remaining live compatibility gate; it has not been run during this audit.
4. If those checks pass, run the predeclared final evaluation sequentially with per-model caps. Use the public Predict/Learn commands, not legacy batch scripts for the original winning-quadrant benchmark. Preserve incomplete runs for review rather than deleting them and rerunning to obtain a better score.

Provider behavior references: [OpenRouter errors](https://openrouter.ai/docs/api_reference/errors-and-debugging), [provider routing and parameter support](https://openrouter.ai/docs/guides/routing/provider-selection), and [reasoning tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens).

## Pilot prepared after the audit

The [development pilot plan](development-pilot-2026-11-14.json) fixes the ten model/provider pairs, three development targets, protocol, pricing snapshots, and individual spending caps totaling $3.45. MiMo uses the available native `xiaomi/fp8` endpoint. The estimate is approximately $0.19 by repricing the earlier GLM token usage; it is not a guaranteed price. This pilot does not authorize or launch final evaluation.

The pilot subsequently completed: 116/120 predictions were valid for $0.11486105754 in reported cost. MiniMax and DeepSeek exhausted the 4,000-token allowance on four one-shot predictions; all Learn episodes were valid. The full campaign remains on hold pending the token-allowance decision. See the [saved pilot findings](https://github.com/1999labs/RTR-bench/blob/main/results/development-preflight-2026-11-14/README.md).

An authorized follow-up at 8,000 tokens then produced 24/24 valid predictions across MiniMax and DeepSeek for $0.00999899252, with no truncation. DeepSeek used up to 7,665 output tokens. This was a development check only; CLI defaults and final protocol settings were not changed. See the [8,000-token findings](https://github.com/1999labs/RTR-bench/blob/main/results/development-token-check-8000-2026-11-14/README.md).

The final campaign plan now fixes 8,000 tokens for all eleven models, including a matching GLM Flash rerun. Public command defaults in the prepared 0.2.1 release have been aligned to it. The historical audit and pilot measurements above retain their original settings. No final campaign calls were made while preparing this plan.
