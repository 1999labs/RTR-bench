# GLM 5.3 Flash: full development comparison

Completed November 13, 2026, using `z-ai/glm-5.3-flash` pinned to Relace (`relace/fp4`). This run covers all 30 development targets, days 100–129. The 45 final evaluation targets were not run.

The protocol matches the five-target pilot: the only manifest configuration differences are the target list and a fresh $0.25 spending cap. The five pilot targets received fresh responses here; their earlier responses were not pooled into these results. Temperature remains 0, maximum output tokens 2,000, evidence budget three, random seed 7, and maximum agent turns eight.

| Strategy | Score / 100 | Gain vs no examples | Paired 95% gain interval | Valid predictions | HTTP attempts |
|---|---:|---:|---|---:|---:|
| No examples | 86.40 | — | — | 30/30 | 30 |
| Random examples | 79.21 | -7.19 | -16.35 to -0.40 | 28/30 | 31 |
| Similar examples | 83.18 | -3.22 | -6.86 to +0.26 | 30/30 | 31 |
| Agent-selected examples | 84.31 | -2.09 | -4.66 to +0.67 | 30/30 | 147 |

Uniform baseline: 81.61. Constant reference baseline: 81.25. These are distribution scores, not percentage accuracy. The no-examples condition also supplies the direct distribution evaluation because its prediction prompt matches that track exactly.

## Interpretation

No examples had the highest mean score in this run. Agent-selected evidence improved 10 targets and worsened 20 relative to no examples. The agent's mean gain interval includes zero, as does the similarity baseline's; these development results do not establish a general strategy ranking. Intervals use 2,000 entity-group bootstrap samples, seed 7, without multiple-comparison correction. They do not measure repeat-run model variance or uncertainty in the original crowd distributions.

Random examples had two missing predictions, for Micro-dosing (day 114) and People Pleasing (day 122). Both were HTTP 200 responses with `finish_reason: length`, 2,000 completion tokens, and null final content. They receive zero points under the fixed protocol and were not rerolled. As a diagnostic only, on the 28 targets with valid random predictions, random scored 84.87 and averaged -1.40 points against the matching no-examples predictions. This selected subset does not replace the official 30-target score. The two failed targets contribute -5.88 points to the full-set paired gain; completion reliability accounts for much of the random condition's loss.

Examples illustrate both useful and harmful evidence transfer:

- **Friends with Benefits:** the agent inspected Open Relationships and One Night Stands, then stopped after two examples. Its score rose from 82.23 without examples to 94.94 (+12.71).
- **Steve Jobs:** the agent inspected Elon Musk, Vitalik Buterin, and Barack Obama. Its score fell from 91.43 to 74.44 (-16.99). Its prediction assigned 50% to honest/dividing, compared with about 4% observed. Related public figures did not reliably predict this audience's response to the target.
- **Buddhism:** lexical retrieval selected Socialism, Capitalism, and Burning Man. Its score fell from 95.33 to 70.74 (-24.60). This is a concrete limitation of the existing text-overlap baseline.
- **Cold Plunges:** lexical retrieval selected Concession Speeches, Non-Fungible Tokens, and McDonald's; the score fell from 89.22 to 61.82 (-27.40).

All 30 agent predictions were valid, with zero rejected actions. The agent used 87 inspections and 147 model turns: 27 episodes used three inspections and five turns; Friends with Benefits, Toxic Positivity, and People Pleasing used two inspections and four turns. Additional turns and differing action instructions mean these comparisons do not isolate evidence selection from compute or prompt effects.

## Spending and verification

There were 239 HTTP attempts: 237 responses and two timeouts. The timeouts occurred on Random/Sacrifice (day 113) and Similar/Steve Jobs (day 124); both episodes succeeded on retry. Their costs remain unknown and their reservations remain in the ledger.

- Reported cost across responses: **$0.0178577662**.
- Known cost rounded upward per request for budget accounting: **$0.017857880**.
- Retained reservations for the two unknown-cost attempts: **$0.083989966**.
- Total conservative accounting: **$0.101847846**, below the authorized **$0.25**.

The reported cost is not a complete final bill because the two timed-out requests have unknown cost. No reservation was released for those requests. See `spending.json` for the durable ledger and `analysis.json` for derived diagnostic metrics.

Offline report replay completed successfully, reconstructing predictions and evidence traces from saved responses and the frozen manifest. The 35-test suite and build had passed for the committed runner before this run; no runner code or prompts changed during the comparison.

## Suggested next development work

1. Diagnose the token-limit failures and choose an explicit completion/reasoning budget for the next version. Validate any adapter changes with fixtures before a separately authorized paid comparison. Preserve this run as the original configuration's result.
2. Add a documented semantic retrieval baseline fitted or indexed using reference data only, alongside the existing lexical baseline. Use development targets to assess whether more relevant examples help.
3. Test evidence weighting and abstaining from weak analogies in a versioned agent prompt. Freeze the resulting protocol before evaluating the untouched final targets.

These are proposals, not changes implemented by this run. A second model under the same frozen protocol would also help distinguish model-specific behavior from environment limitations.

[Interactive report](report.html) · [Full metrics and traces](report.json) · [Manifest](manifest.json) · [Budget ledger](spending.json)
