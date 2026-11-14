# GLM 5.3 Flash: 4,000-token development comparison

Completed November 13, 2026 (America/New_York). All 30 development targets, days 100–129, were evaluated under all four strategies using `z-ai/glm-5.3-flash` pinned to Relace (`relace/fp4`). All 120 predictions were valid. The 45 final evaluation targets remain untouched.

Compared with [the 2,000-token run](../z-ai-glm-5-3-flash-08043092015d8d4a/README.md), the only manifest configuration change is `settings.maxTokens: 2000 -> 4000`. Prompts, reference pool, target list, selectors, seed, provider, prices, retry policy, 60-second timeout, scoring, temperature, and per-run $0.25 cap match. All responses were generated afresh. Source commit: `7b66cac5`.

| Strategy | Previous score / 100 | Current score / 100 | Change between runs | Current gain vs no examples |
|---|---:|---:|---:|---:|
| No examples / direct distribution | 86.40 | 87.03 | +0.63 | — |
| Random examples | 79.21 | 83.88 | +4.67 | -3.15 |
| Similar examples | 83.18 | 87.04 | +3.86 | +0.01 |
| Agent-selected examples | 84.31 | 83.72 | -0.59 | -3.31 |

Uniform baseline: 81.61. Constant reference baseline: 81.25. Scores measure distribution error, not percentage accuracy. The no-examples condition also supplies the direct distribution result; no duplicate standalone calls were needed.

## Completion reliability

All 239 HTTP attempts returned responses, with no transport retries, length stops, invalid predictions, or missing predictions. The previous run had two missing random-condition predictions and two timed-out attempts followed by successful retries.

The two previously missing predictions both succeeded below the old limit: Random/Micro-dosing used 1,576 completion tokens, and Random/People Pleasing used 1,419. Their recovery is not direct evidence that extra output capacity was necessary. Among the 28 random-condition targets that were valid in both runs, the current score was 1.54 points lower on average. Recovery of the two zero-scored failures explains the aggregate random score increase.

Three current responses did use the additional capacity:

| Condition | Target | Completion tokens |
|---|---|---:|
| Similar | Instagram | 2,989 |
| Similar | Netflix | 2,248 |
| Agent | Kim Jong-un | 3,736 |

The maximum observed usage was 3,736. The 4,000-token setting provided useful headroom in this run, but one run at each setting cannot separate effects of output allowance from repeat-run or provider variation. Both runs used temperature zero; that setting did not produce identical predictions across these requests. Of 30 no-example predictions, 29 changed, despite all current no-example responses staying below 2,000 completion tokens.

## Evidence effects within the current run

Similarity-selected evidence essentially tied no examples (+0.01 points; paired 95% interval -2.67 to +2.72). Random examples averaged -3.15 points (-6.14 to -0.20), and agent-selected examples averaged -3.31 (-6.08 to -0.20). These are exploratory entity-group bootstrap intervals with 2,000 resamples and seed 7, without multiple-comparison correction. They describe variation across this target set, not uncertainty across repeated model runs or in the original crowd distributions.

The agent used 89 inspections and 149 model turns, with no rejected actions. It stopped after two inspections for Friends with Benefits and used three for every other target. The ordered evidence choices exactly matched the earlier run on 9 of 30 targets. Its action sequence and additional compute differ from the automatic baselines, so the comparisons do not isolate evidence-selection quality.

Across runs, Similar improved by 3.86 points (paired target interval +1.70 to +6.14), but that interval does not establish that increasing the token limit caused the improvement. The other three between-run change intervals include zero. Full paired target changes and the matched-valid random diagnostic are in `comparison.json`.

These results still do not demonstrate an average benefit from agent-selected evidence. They also show that the apparent advantage or disadvantage of the lexical baseline can vary substantially between runs. Repeated runs at one fixed configuration should precede interpreting small improvements from further prompt or retrieval changes.

## Cost and verification

- Reported API cost: **$0.0185089496**.
- Conservative ledger accounting, rounded upward per response: **$0.018509064**.
- Unknown-cost requests: **0**.
- Authorized cap for this run: **$0.25**.
- HTTP attempts: **239** (30 no examples, 30 random, 30 similar, 149 agent).

All 38 tests and the build passed before the live run. New offline coverage checks CLI propagation to every strategy and agent turn, distinct run identities and resume behavior, input validation, length-stop handling, and larger spending reservations. Offline replay exactly reproduced the saved report, and a configuration comparison confirmed that only the output allowance changed. No prompts or runtime code changed during execution.

## Recommended next step

Add an explicit replicate identifier so identical settings can generate a new, separately recorded run rather than resume the existing one. Then, with separate spending authorization, run two more 4,000-token development replicates and summarize variation across the three runs at that fixed setting. Keep failed episodes and unknown costs in their respective records. Use that repeatability check before testing semantic retrieval or revised evidence weighting; retain the final targets for the frozen protocol.

Replication support and additional paid runs are proposals, not work performed in this comparison.

[Interactive report](report.html) · [Current metrics and traces](report.json) · [Paired comparison data](comparison.json) · [Manifest](manifest.json) · [Spending ledger](spending.json)
