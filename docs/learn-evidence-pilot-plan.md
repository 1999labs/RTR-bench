# Small Learn comparison

**Proposed, not run. Maximum new spending: $1 total.**

| Item | Plan |
|---|---|
| Model | MiMo V2.6 Flash through Xiaomi (`xiaomi/fp8`) |
| Prompts | First 10 development targets, days 100–109 |
| With examples | Learn can inspect up to three past crowd distributions |
| Without examples | Same Learn workflow, with zero inspections allowed |
| Size | One fresh pass per condition: 20 final predictions |
| Expected cost | About $0.02–$0.05; an estimate, not a fixed price |
| Spending ceiling | $0.50 per condition, $1 combined |
| Expected time | Roughly 10–20 minutes; provider delays can extend this |

The prompts are **Instagram, The CIA, Minimum Wage, Buddhism, Pride Month, Drake, Netflix, Friends with Benefits, Toxic Positivity, and Dry January**. They are selected by chronological order, not by their outcomes.

MiMo is a useful first check because all its recent final predictions were valid, yet Learn scored below Predict. This is an exploratory choice, not a representative sample of models.

## Keep the comparison simple

Both conditions use the same Learn instructions, reference-name catalog, answer format, and recovery rules. Each target starts fresh, with up to eight actions/model turns and 8,000 output tokens per turn. Temperature is zero, reasoning uses the provider default, and each call retains the existing three-attempt and 60-second limits. Only the inspection budget changes, from zero to three. Without examples, the model cannot obtain reference distributions or submission counts.

Run without examples first, then with examples, sequentially. Both may answer early; equal allowances do not mean equal actual token use. This pilot does not choose a universal token limit for other models.

## What we will report

Compare scores on the same ten prompts, valid answers, and cost. Show **with examples minus without examples**, alongside the historical-average baseline recalculated for these ten targets. Keep terminal failures at zero; pending targets leave the comparison incomplete. Record actual turns, tokens, and inspected examples to help interpret the difference.

Preserve both runs separately. Do not update the final leaderboard or claim a general learning effect from this small development check.

## Spending and execution

The estimate scales saved MiMo usage at the [currently listed Xiaomi prices](https://openrouter.ai/api/v1/models/xiaomi/mimo-v2.6-flash/endpoints), checked November 15, 2026. The $1 ceiling leaves room for conservative reservations when a timeout's charge is unknown; it is not the expected bill. Stop for review if a condition remains incomplete, a limit is reached, or the provider/settings require changing. Do not automatically raise the cap or switch providers.

The existing CLI supports both conditions with `learn --budget 0` and `learn --budget 3`; no runner change is needed. [Exact settings, target IDs, and command arguments](learn-evidence-pilot-plan.json) are recorded for execution after approval. Check the provider snapshot again before launch; no paid calls have been made for this plan.

**Next step:** run this development comparison with the $1 total ceiling.
