# Why two examples-enabled predictions worsened

This is an inspection of saved MiMo outputs for development days 102 and 109. No new model calls were made. These cases were selected because they had the two largest losses; they are explanations of observed failures, not independent tests.

Each condition started a fresh conversation. The table compares separate runs, not a recorded revision of one initial prediction. Actions and final probabilities show what evidence was accessed and what was predicted; they do not prove the model's internal reasoning.

## Minimum Wage

Score: **90.51 without examples → 71.24 with examples**, a 19.26-point loss. The target distribution contains 198 submissions.

| Crowd share | Observed | Without examples | With examples |
|---|---:|---:|---:|
| Performed / uniting | 4.0% | 8.0% | 18.0% |
| Honest / uniting | 6.1% | 29.0% | 5.0% |
| Performed / dividing | 14.1% | 23.0% | 60.0% |
| Honest / dividing | 75.8% | 40.0% | 17.0% |

Examples actually inspected:

| Reference | Performed / uniting | Honest / uniting | Performed / dividing | Honest / dividing |
|---|---:|---:|---:|---:|
| SOCIALISM (day 93) | 14.2% | 10.1% | 44.8% | 30.9% |
| UNIVERSAL BASIC INCOME (day 86) | 22.4% | 3.1% | 72.4% | 2.0% |

**What the records show:** the examples were Socialism and Universal Basic Income. Both leaned toward performed/dividing, whereas Minimum Wage strongly leaned toward honest/dividing. The example-enabled prediction assigned 60% to performed/dividing and only 17% to honest/dividing. Its four probabilities are within 1.57 percentage points of the equally weighted average of the two reference distributions.

**Interpretation:** this is consistent with transferring the references' distributions too directly because their topics are related. It is not proof that the model literally averaged them. The prediction improved on the dividing axis (63% → 77%, versus about 90% observed), but became much worse on the honest axis (69% → 22%, versus about 82% observed). Topic similarity did not preserve the crowd's honest/performed distinction.

The run first produced a malformed action and an invalid reference ID, then recovered using the existing feedback rules. It submitted a valid answer on turn six of eight, with one inspection still available. It was not forced to stop by an action, inspection, or token limit, and received no failure penalty.

Saved episode records: [without-examples](without-examples/xiaomi-mimo-v2-6-flash-1adee6b6f6cca775/episodes/agent/102.json) · [with-examples](with-examples/xiaomi-mimo-v2-6-flash-e7353baedf65099c/episodes/agent/102.json).

## Dry January

Score: **87.45 without examples → 69.16 with examples**, a 18.30-point loss. The target distribution contains 132 submissions.

| Crowd share | Observed | Without examples | With examples |
|---|---:|---:|---:|
| Performed / uniting | 84.1% | 42.0% | 18.0% |
| Honest / uniting | 9.1% | 33.0% | 42.0% |
| Performed / dividing | 4.5% | 13.0% | 12.0% |
| Honest / dividing | 2.3% | 12.0% | 28.0% |

Examples actually inspected:

| Reference | Performed / uniting | Honest / uniting | Performed / dividing | Honest / dividing |
|---|---:|---:|---:|---:|
| SOBRIETY (day 58) | 21.9% | 27.8% | 24.0% | 26.3% |
| ALCOHOL (day 80) | 5.2% | 34.8% | 4.3% | 55.7% |
| FOMO (day 46) | 0.0% | 43.4% | 5.7% | 50.9% |

**What the records show:** the examples were Sobriety, Alcohol, and FOMO. None strongly resembled Dry January's observed 84.1% performed/uniting share. The example-enabled answer assigned only 18% to that quadrant, compared with 42% without examples. Its total honest share increased from 45% to 70%, while the target's observed honest share was only 11.4%.

**Interpretation:** the inspected evidence is topically plausible, but its crowd distributions describe different readings from the target's. One possible explanation is that the model generalized from sobriety or alcohol to the named month-long practice, overlooking that this audience classified them differently. The records establish the distribution mismatch, not why participants made those judgments or the model's exact rationale.

All five actions were accepted; the model inspected three examples and submitted a valid prediction. There were no API errors, length stops, or failure penalties in this episode.

Saved episode records: [without-examples](without-examples/xiaomi-mimo-v2-6-flash-1adee6b6f6cca775/episodes/agent/109.json) · [with-examples](with-examples/xiaomi-mimo-v2-6-flash-e7353baedf65099c/episodes/agent/109.json).

## What this tells us

Together these two cases contribute **-3.76 points** to the ten-target average difference. The other eight contribute **+1.64 points**, leaving the observed **-2.12** overall result. Across those other eight targets the mean difference was +2.05; this is a post-hoc diagnostic, not a replacement score. Both losses stay in the official pilot result.

The working explanation is poor transfer of audience responses between related concepts. These records do not reveal a scoring error, nor do they establish that examples generally hurt. The existing `transfer-check-v1` instructions already tell the model to assess each axis separately and discount weak comparisons; merely adding that instruction again would not address an omitted rule.

Keep the scorer and saved results. Before changing the Learn instructions, evaluate the same comparison across the full development set with a predeclared budget and report every target, including failures. The two cases alone should not determine a prompt change or a claimed general effect.

[Full pilot results and uncertainty](README.md)
