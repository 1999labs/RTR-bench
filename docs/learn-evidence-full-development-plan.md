# Learn comparison across all 30 development prompts

**Prepared, not run. Maximum new spending: $1 total.**

| Item | Plan |
|---|---|
| Model and provider | MiMo V2.6 Flash through Xiaomi (`xiaomi/fp8`) |
| Targets | All 30 development prompts, days 100–129 |
| Conditions | Learn with up to three examples; Learn with zero examples |
| Size | One fresh pass per condition: 60 predictions |
| Estimated cost | $0.02–$0.08 |
| Spending ceiling | $0.50 per condition, $1 combined |
| Estimated time | 20–30 minutes, longer if the provider delays requests |

## Keep the pilot settings

Use the same Learn instructions, reference-name catalog, answer format, eight-action/model-turn limit, 8,000 output tokens per turn, temperature zero, provider-default reasoning, seed 7, and failure/recovery rules. Only the inspection budget differs between conditions: zero versus three. Neither condition receives target answers or score feedback. Start a fresh conversation for each prompt.

Run without examples first, then with examples. Both conditions may submit early. The comparison matches allowances, not actual token use.

## Keep every result

Run all 30 targets again in each condition, including the ten pilot targets. Save these 60 new predictions separately from the [pilot](../results/development-evidence-pilot-v1/README.md); do not choose between old and new answers or remove difficult prompts. The existing CLI supports this with `--limit 30`; no runner change is needed.

Report scores, differences from the historical-average baseline calculated on these 30 targets, valid answers, and costs. The main comparison is **with examples minus without examples**, with a paired uncertainty interval and per-prompt results. Terminal failures stay at zero; pending targets leave the run incomplete. Do not update the final leaderboard.

This is a broader development check, not an untouched final test. It can inform the next protocol decision, but one model and one pass cannot establish a general learning effect. Repeated predictions on the ten overlapping prompts are not extra independent targets.

## Spending

Scaling the completed pilot gives about $0.019 at its reported charges or $0.041 without cache discounts, and about 21 minutes. The wider estimate allows for variation. [Xiaomi's listed prices](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints) were unchanged when checked on November 15, 2026. Check again before launch.

The $1 ceiling includes conservative reservations for unknown charges and is separate from the completed pilot's spending. Stop if a condition remains incomplete, a limit is reached, or the provider/settings need changing. Do not automatically raise limits, switch providers, or reroll final answers.

[Exact settings, all target names, and command arguments](learn-evidence-full-development-plan.json) are saved before execution. No paid calls have been made for this plan.

**Next step:** run the 30-prompt comparison under the $1 combined ceiling.
