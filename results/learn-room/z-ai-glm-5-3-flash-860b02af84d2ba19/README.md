# GLM 5.3 Flash: transfer-check-v1 development pilot

**Follow-up:** the two recommended repeats are now complete. See the [three-run policy comparison](../comparisons/glm-5-3-flash-policy-repeats/README.md) for current findings and next steps. The original single-run analysis below is retained as recorded.

Completed November 13, 2026 (America/New_York). Model `z-ai/glm-5.3-flash`, pinned to Relace (`relace/fp4`), all 30 development targets, all four strategies, 4,000 output tokens, and a fresh $0.125 cap. The only agent change was the optional `transfer-check-v1` evidence-use instruction. All 120 predictions were valid. The 45 final evaluation targets remain untouched.

The new agent scored **85.85/100**, compared with **83.66** averaged across the three earlier default-policy runs. It improved on that target-level historical mean for 21 targets and worsened on nine. Its score exceeds the best of those three earlier agent runs (84.53), but one new run does not establish a repeatable policy improvement.

| Strategy | Earlier three-run mean | Current pilot | Change | Current gain vs no examples |
|---|---:|---:|---:|---:|
| No examples / direct distribution | 87.63 | 86.53 | -1.10 | — |
| Random examples | 84.74 | 84.48 | -0.27 | -2.06 |
| Similar examples | 86.33 | 86.70 | +0.37 | +0.17 |
| Agent | 83.66 | 85.85 | +2.19 | -0.68 |

Scores measure distribution error, not percentage accuracy. The baseline prompts and automatic reference selections are identical to the earlier runs; their responses were generated afresh. Only the agent receives the new instruction.

## Interpretation

The agent remains below this run's no-example score by **0.68 points**, with an exploratory paired target-bootstrap 95% interval of **-3.78 to +2.41**. It beats no examples on 12 targets and loses on 18. We have not demonstrated an average benefit from gathering evidence.

The historical default-agent deficit averaged -3.97 points. The apparent narrowing to -0.68 is 3.29 points: 2.19 points come from the higher agent score and 1.10 from a lower no-example control score. The latter should not be credited to the agent policy. The current no-example score is below the earlier observed range of 87.03–87.95, reinforcing the need for repeat measurements.

The policy is a promising candidate to repeat, not a replacement for the default yet. The new prompt can change which references the agent selects as well as how it uses them. This full-agent comparison does not isolate those mechanisms. One new run against three historical runs also does not isolate policy effects from run-to-run or provider variation. The within-run intervals resample target groups (2,000 samples, seed 7), are not corrected for multiple comparisons, and do not quantify uncertainty across repeated model runs.

## Audit cases and regressions

The five previously most harmful cases all have higher agent scores than their historical means, averaging +2.96 points, but each new score remains within that target's earlier three-run range. All five still score below the matching no-example prediction. The original failure patterns are not resolved:

- **Kim Jong-un:** score 57.58 versus historical mean 53.28, but performed/dividing remains 12% predicted against 86.7% observed. The agent again selected Donald Trump, Barack Obama, and National Anthems.
- **Defense Contractors:** score 80.44 versus 74.13. The agent inspected Fossil Fuels and Police Departments, then stopped. It predicted 88% dividing versus 93.7% observed, but only 43% performed versus 83.5% observed. The mismatched transfer between axes persists.
- **Rainbows:** score 77.20 versus 75.86. Flags and Same-sex Marriage remain the selected evidence; honest/uniting is 34% predicted versus 87.6% observed.
- **Tom Brady:** score 72.36 versus 70.02. The agent still underpredicts honest/dividing (16% versus 76.3% observed).
- **Billionaires:** score 80.16 versus 79.65. Its gap to the new control is only -0.23, but the control itself scored substantially lower than before; this is not a large absolute agent improvement.

Of the five previously consistently helped cases, four still outperform the current no-example prediction. Instagram is slightly worse (-0.42), though its agent score remains 98.43. The five cases' mean agent score decreased by 0.65 relative to their historical means. Friends with Benefits now uses three inspections (adding Dating Apps to Open Relationships and One Night Stands); its score is 94.07 versus historical mean 95.53, while still beating its current control by 10.44.

Across all 30 targets, the largest score improvements over historical agent means were Toxic Positivity (+15.10), Brat Summer (+11.33), and Altruism (+10.20). The largest regression was Nature (-8.51); Buddhism and TikTok also declined. These are descriptive development results selected after seeing the pilot, not separate confirmation of the policy's effectiveness. Full target-level comparisons are in `comparison.json`.

## Reliability, usage, and cost

- **120/120 valid predictions**, no transport errors, length stops, or rejected agent actions.
- **235 HTTP attempts**: 30 for each one-shot condition and 145 agent turns.
- **85 agent inspections**. Five episodes stopped at two: Dry January, People Pleasing, Cold Plunges, Rainbows, and Defense Contractors. All other agent episodes used three.
- Reported API cost: **$0.0216115696**.
- Conservative accounting, rounded upward per response: **$0.021611675**, below **$0.125**.
- Unknown-cost requests: **0**.

The longer prompt increased token usage despite fewer agent turns: the agent used 308,674 reported tokens. Usage does not reduce the prediction score under the frozen protocol.

## Verification and next step

Source commit: `3a179de26b6ee994d238bd42ce8721c7754ab05f`. Its 43-test suite and build passed before this run. No runtime code, prompts, or settings changed during execution. The new report and all three historical reports replay exactly offline. Initial automatic requests and evidence match; the agent initial request differs only in its system prompt. Other configuration differences from the first 4,000-token run are the policy identifier/hash and spending cap.

Recommended next step: repeat the new policy twice at the same settings on all 30 development targets, with a separately authorized $0.125 cap per repeat ($0.25 combined). Compare the resulting three-run new-policy mean and range against the three default-policy runs, including paired evidence gains and regressions. Keep the original policy as default and the final targets untouched while assessing repeatability. Those additional runs are proposed, not performed here.

Reproduce the comparison without API calls:

```bash
node results/learn-room/z-ai-glm-5-3-flash-860b02af84d2ba19/analyze.mjs
```

[Interactive report](report.html) · [Metrics and traces](report.json) · [Historical comparison](comparison.json) · [Default-policy repeatability](../comparisons/glm-5-3-flash-4000-repeats/README.md)
