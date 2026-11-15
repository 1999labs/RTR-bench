# MiMo: Learn with and without examples

**Exploratory development comparison.** MiMo V2.6 Flash through Xiaomi (`xiaomi/fp8`) answered the same ten development prompts in two conditions. This is separate from the final leaderboard.

| Condition | Score / 100 | vs historical baseline | Valid answers | Reported cost |
|---|---:|---:|---:|---:|
| Historical-average baseline | 83.65 | 0.00 | — | — |
| Uniform baseline (25% each) | 83.56 | −0.09 | — | — |
| [Learn without examples](without-examples/xiaomi-mimo-v2-6-flash-1adee6b6f6cca775/report.md) | 88.01 | +4.36 | 10/10 | $0.00184095 |
| [Learn with examples](with-examples/xiaomi-mimo-v2-6-flash-e7353baedf65099c/report.md) | 85.89 | +2.24 | 10/10 | $0.00433780 |

**With examples minus without examples: −2.12 points.** The exploratory paired 95% interval is −8.67 to +4.45. With examples was better on 3 prompts, worse on 7, and tied on 0. The interval includes zero: this pilot does not establish a reliable improvement or deterioration beyond these observed runs.

Scores measure distribution agreement, not percentage accuracy. Both baselines use these ten targets; the historical-average prediction itself uses only the 90 reference windows. Terminal invalid or missing predictions receive zero and stay in the denominator. Intervals resample target groups; they do not measure variation across repeated model calls.

Both conditions returned valid answers for every target, so their score difference is not caused by missing-answer penalties.

## What was held fixed

Both runs used the same Learn instructions (`transfer-check-v1`), reference-name catalog, action interface, dataset, targets (days 100–109), seed 7, temperature zero, provider-default reasoning, eight-action/model-turn limit, and 8,000-token allowance per turn. Only the inspection budget differed: zero versus three. The offline replay verifies that the zero-budget condition received no reference distributions or submission counts.

Each target began a fresh conversation. The no-example condition ran first, then the example-enabled condition. This is one pass per condition on development prompts. Model selection was informed by earlier evaluation results; it is not an independent confirmation of a general learning effect. Equal allowances do not imply equal actual compute.

## Actual usage

| Condition | Inspections | Model turns | HTTP attempts | Reported tokens | API/transport errors | Length stops |
|---|---:|---:|---:|---:|---:|---:|
| without-examples | 0 | 11 | 11 | 9806 | 0 | 0 |
| with-examples | 25 | 48 | 48 | 77222 | 0 | 0 |

Total provider-reported cost: $0.0061787488. Ledger accounting, including any unresolved reservations and rounding: $0.006178769, within the **$1 combined cap** ($0.50 per condition). Unresolved charges: 0 attempts, retaining $0.000000000. These reservations are not an invoice. Elapsed time: 6.85 minutes.

The no-example run recovered from one malformed action. The example-enabled run recovered from two malformed actions and one invalid reference ID. All used the existing feedback rules; no final prediction was retried.

## Each prompt

| Day | Prompt | Without examples | With examples | Difference | Inspected references |
|---|---|---:|---:|---:|---|
| 100 | INSTAGRAM | 97.50 | 97.15 | −0.35 | CONTENT CREATORS (day 2), FOMO (day 46), SCREEN TIME (day 73) |
| 101 | THE CIA | 83.50 | 83.36 | −0.14 | POLICE DEPARTMENTS (day 68), PRISONS (day 36) |
| 102 | MINIMUM WAGE | 90.51 | 71.24 | −19.26 | SOCIALISM (day 93), UNIVERSAL BASIC INCOME (day 86) |
| 103 | BUDDHISM | 93.51 | 90.42 | −3.09 | THERAPY (day 91), SILENCE (day 69) |
| 104 | PRIDE MONTH | 98.07 | 94.68 | −3.39 | SAME-SEX MARRIAGE (day 87), FLAGS (day 77), BURNING MAN (day 56) |
| 105 | DRAKE | 87.57 | 98.38 | +10.81 | KENDRICK LAMAR (day 88), ELON MUSK (day 30), ELON MUSK (day 99) |
| 106 | NETFLIX | 93.84 | 98.08 | +4.24 | MCDONALD'S (day 66), STARBUCKS (day 84) |
| 107 | FRIENDS WITH BENEFITS | 83.61 | 97.61 | +14.00 | OPEN RELATIONSHIPS (day 11), ONE NIGHT STANDS (day 90) |
| 108 | TOXIC POSITIVITY | 64.53 | 58.81 | −5.71 | TRAUMA DUMPING (day 64), COMPLIMENTS (day 38), FAMILY DINNERS (day 57) |
| 109 | DRY JANUARY | 87.45 | 69.16 | −18.30 | SOBRIETY (day 58), ALCOHOL (day 80), FOMO (day 46) |

The two largest losses are examined in [Minimum Wage and Dry January: case studies](case-studies.md), with the inspected distributions and a distinction between observed behavior and interpretation.

## Verification

The offline analyzer replays saved actions, independently recomputes every score, verifies all settings against the approved plan, reconciles the ledger and combined ceiling, and confirms that completed runs resume without network access or report changes. No saved answers were rerolled.

```bash
node results/development-evidence-pilot-v1/analyze.mjs
```

- [Original plan](../../docs/learn-evidence-pilot-plan.md)
- [Exact planned settings](../../docs/learn-evidence-pilot-plan.json)
- [Execution record](execution.json)
- [Verified comparison](analysis.json)
- [Provider snapshot at launch](provider-at-launch.json)
