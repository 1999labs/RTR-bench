# GLM 5.3 Flash: three runs per agent policy

The optional `transfer-check-v1` agent averaged **85.67/100**, versus **83.66** for the original policy, on the same 30 development targets. Each new-policy agent run exceeded the highest observed original-policy score. However, the agent still scored below its matching no-example control in every run. These results support taking the new policy forward as a candidate; they do not demonstrate an average benefit from evidence gathering.

All runs use GLM 5.3 Flash, Relace (`relace/fp4`), 4,000 output tokens, seed 7, the frozen 90-reference pool, and all four strategies. Only the agent system instruction changes between policy groups. Baseline requests and automatic reference selections are identical; baseline responses are generated afresh. Scores measure distribution error, not percentage accuracy. Final evaluation targets were not used.

## Scores

| Strategy | Original mean | Transfer-check mean | Change | Transfer-check observed range |
|---|---:|---:|---:|---:|
| No examples / direct distribution | 87.63 | 87.34 | -0.29 | 86.53–88.13 |
| Random examples | 84.74 | 84.49 | -0.25 | 84.47–84.53 |
| Similar examples | 86.33 | 86.18 | -0.15 | 85.77–86.70 |
| Agent | 83.66 | 85.67 | +2.01 | 85.48–85.85 |

| Transfer-check run | Agent | No examples | Agent gain |
|---|---:|---:|---:|
| [initial](../../z-ai-glm-5-3-flash-860b02af84d2ba19/README.md) | 85.85 | 86.53 | -0.68 |
| [repeat-2](../../z-ai-glm-5-3-flash-0b4ca88301445300/README.md) | 85.68 | 87.37 | -1.69 |
| [repeat-3](../../z-ai-glm-5-3-flash-53445f782b4d4c0c/README.md) | 85.48 | 88.13 | -2.65 |

The mean agent deficit narrowed from **-3.97 to -1.67 points**. Of that 2.30-point change, 2.01 comes from a higher agent score and 0.29 from a lower no-example control mean. The control change should not be credited to the agent policy. The no-example condition also supplies the direct distribution track's result, since its prediction messages and scorer match exactly.

The agent's observed run-score standard deviation fell from 0.90 to 0.19. Its mean within-target standard deviation fell from 3.78 to 3.02, so the tight aggregate range hides meaningful variation on individual cases. These are descriptive statistics from three runs, not confidence intervals or proof that the instruction caused greater stability. Random examples also became substantially more stable despite unchanged instructions.

## Audit follow-up and regressions

Relative to original-policy target means, 17 agent target scores improved and 13 worsened. The largest improvements were Toxic Positivity (+17.13), Rainbows (+10.54), Altruism (+9.26), Brat Summer (+8.73), and Defense Contractors (+8.08). The largest regressions were Billionaires (-7.71), Nature (-7.23), and Drake (-4.99).

The [earlier audit](../glm-5-3-flash-4000-repeats/audit.md) selected five consistently helped cases and five of the worst consistently harmed cases. Across the new three-run averages:

| Previously harmed target | Agent score change | New agent gain vs no examples |
|---|---:|---:|
| Kim Jong-Un | +1.23 | -24.91 |
| Rainbows | +10.54 | -3.02 |
| Defense Contractors | +8.08 | -10.45 |
| Tom Brady | -0.25 | -13.19 |
| Billionaires | -7.71 | -11.27 |

Those five cases improved by 2.38 points on average, but all five still trail their controls on average. Kim Jong-un, Defense Contractors, Tom Brady, and Billionaires lose to no examples in every new run; Rainbows has mixed gains. The failure patterns have not been resolved.

The five previously helped cases lost 1.62 agent-score points on average but all retain positive mean gains against no examples. Friends with Benefits, Drake, TikTok, and Kamala Harris retain gains in every new run; Instagram has one small loss (-0.42). These selected cases are diagnostics, not an independent validation set. Full per-target values are in [analysis.json](analysis.json).

## Reliability, cost, and verification

The two newly authorized repeats produced **240/240 valid predictions**, using **469 HTTP attempts**, with no transport errors, length stops, rejected agent actions, or unknown costs. Their reported cost was **$0.042132392**; conservative accounting was **$0.042132612**, within the fresh combined **$0.25** authorization.

| Repeat | HTTP attempts | Reported cost | Accounted cost | Cap |
|---|---:|---:|---:|---:|
| repeat-2 | 234 | $0.0208130316 | $0.020813136 | $0.125 |
| repeat-3 | 235 | $0.0213193604 | $0.021319476 | $0.125 |

Including the initial transfer-check pilot, the new-policy group has 360/360 valid predictions and 704 HTTP attempts. Across both policy groups, all 720 predictions are valid. One historical original-policy attempt timed out; its unknown cost remains conservatively reserved in its original ledger. It is not part of the new authorization above.

All six reports reconstruct exactly from their saved records. The offline analysis verifies configuration equivalence except policy/hash, replicate identifier, and spending caps; it also checks identical baseline requests/evidence and agent initial requests differing only in the system message. Runtime source at the start of the two repeats was commit `4cd02f4b`; no code, prompts, or settings changed during them. The runtime's 43 tests and build had passed before the pilot; this comparison adds records and documentation only.

Reproduce locally without API calls:

```bash
node results/learn-room/comparisons/glm-5-3-flash-policy-repeats/analyze.mjs
```

## Interpretation limits

- Three repeats use the same 30 development targets; they do not create 90 independent targets per policy.
- Policy groups ran sequentially rather than randomly interleaved, so provider or temporal variation may contribute to differences.
- Full-agent comparisons allow both reference selection and use to change, and do not isolate those mechanisms.
- The new policy was motivated by these development outcomes. Results are development evidence, not held-out performance.
- The original CLI policy remains the default. A below-control agent score is a valid benchmark finding, not a reason to tune until the agent wins.

## Proposed next step: freeze and evaluate

Freeze `transfer-check-v1` as the candidate for the first final evaluation, with the existing scoring, reference pool, four strategies, seed, three-inspection budget, eight-action/eight-turn limits, and 4,000-token allowance. Record one declared run on all 45 untouched evaluation targets, reporting all four scores and paired gains. Preserve the existing retry/failure rules; do not reroll low scores or change the policy after seeing final outcomes. Any later revision needs a new protocol version and must disclose prior exposure to this holdout.

This is a proposal requiring a fresh **$0.25 maximum** authorization; no final evaluation calls have been made. If approved, execute:

```bash
node src/cli.ts learn-room z-ai/glm-5.3-flash --provider Relace --strategy all --split evaluation --limit 45 --max-tokens 4000 --agent-policy transfer-check-v1 --max-usd 0.25
```

Recheck endpoint availability/prices before starting. If the spending guard stops the run, retain it as incomplete and report the reason; do not silently raise the cap or start a replacement ledger. The no-example condition supplies the direct distribution result without a second duplicate run.
