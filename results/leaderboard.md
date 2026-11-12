# RTR-bench

How well does a language model predict how people read a word? 165 windows, 39,828 marks, 4 readings, 4 option orders.

## Leaderboard

| model | score /100 | n | cost | provider | 95% CI | axis x | axis y | Brier | own reading agrees | crowd distance | gap | unstable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `z-ai/glm-5.3-flash` | **43.0** | 165 | $0.0526 | 26 providers | [35.8%, 50.9%] | 55.8% | 60.0% | 0.657 | 38.2% | 0.211 | -4.8% | 17.0% |

## Baselines

- random, 4 options: 25.0%
- always the most common quadrant (bl): 31.5%
- lexical heuristic, cue list in `src/score.ts`: 33.9% [27.3%, 41.2%]

## What the numbers say

- Best predictor: `z-ai/glm-5.3-flash` at 43.0% (chance 25%, majority baseline 31.5%).
- One model only. There is no spread to report and no leaderboard ordering.
- Mean gap between a model's own reading and its prediction of the crowd: -4.8%. A positive gap means the model agrees with the crowd more often when answering for itself than when trying to predict it.
- Axis accuracy is the place to look for a systematic bias. The y axis (uniting vs dividing) and the x axis (performed vs honest) are scored separately, so a model that over-reads division shows up as high axis y and low axis x.

## Method

- Two questions per word: which reading did most people choose (predict), and which reading is yours (read).
- Four calls per question, each with the four options in a different cyclic order. The modal answer is the model's answer. A 2-2 split across orders is treated as no answer and scores zero, so the accuracy figure is a lower bound. The share of windows with no stable answer is the `unstable` column.
- Temperature 0. Prompt version and hash are written into every raw call. Confidence is used only for the Brier score.
- Confidence intervals are bootstrapped by window, 2,000 resamples. Calls within a window are not independent: the largest window contributes 1,163 marks to one question.

## Limits

- The crowd is the audience of one art project on Ethereum, not humanity. It is not a representative sample of anything.
- Prompt sensitivity is real. The prompt is frozen and hashed; a reworded sentence can move scores by ten points.
- The splits are public. A model trained on this repo can score without generalising.

