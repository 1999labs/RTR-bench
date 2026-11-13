# RTR-bench

How well does a language model predict how people read a word? 165 windows, 39,828 marks, 4 readings, 4 option orders.

Scoring **v2**. All crowd co-winners are accepted. Historical scoring-v1 reports are preserved in [history/scoring-v1/](history/scoring-v1/).

## Leaderboard

| model | score /100 | n | cost | provider | 95% CI | axis x | axis y | Brier | own reading agrees | crowd distance | gap | unstable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `google/gemini-3.8-flash` | **46.1** | 165 | $0.7790 | Google AI Studio | [38.2%, 53.3%] | 66.7% | 65.5% | 0.688 | 38.2% | 0.225 | -7.9% | 6.1% |
| `anthropic/claude-haiku-5.5` | **43.6** | 165 | $0.1694 | Claude Platform on AWS | [35.8%, 50.9%] | 63.6% | 61.2% | 0.687 | 36.4% | 0.239 | -7.3% | 7.9% |
| `z-ai/glm-5.3-flash` | **41.2** | 165 | $0.0281 | Tenstorrent | [32.7%, 48.5%] | 56.4% | 60.0% | 0.683 | 40.6% | 0.213 | -0.6% | 20.0% |
| `xiaomi/mimo-v2.6-flash` | **40.6** | 165 | $0.1216 | GMICloud | [32.7%, 47.9%] | 58.2% | 57.6% | 0.681 | 35.8% | 0.230 | -4.8% | 15.2% |
| `deepseek/deepseek-v4.1-flash-1017` | **40.0** | 165 | $0.3414 | Morph | [32.1%, 47.3%] | 60.6% | 58.8% | 0.720 | 37.0% | 0.232 | -3.0% | 8.5% |
| `tencent/hy3` | **40.0** | 165 | $0.2667 | Tencent | [32.7%, 47.3%] | 58.2% | 60.0% | 0.717 | 38.8% | 0.229 | -1.2% | 14.5% |
| `z-ai/glm-5.3` | **40.0** | 165 | $0.2828 | Tenstorrent | [32.7%, 47.3%] | 57.0% | 57.6% | 0.691 | 40.6% | 0.219 | +0.6% | 15.8% |
| `openai/gpt-6-luna` | **37.0** | 165 | $0.1329 | OpenAI | [29.7%, 44.2%] | 53.9% | 58.8% | 0.753 | 29.7% | 0.273 | -7.3% | 11.5% |
| `thinkingmachines/inkling-small` | **37.0** | 165 | $0.1733 | DeepInfra | [30.3%, 44.2%] | 53.3% | 62.4% | 0.886 | 34.5% | 0.225 | -2.4% | 4.8% |
| `minimax/minimax-m3.1-flash` | **32.7** | 165 | $0.2444 | GMICloud | [26.1%, 40.0%] | 49.1% | 46.1% | 0.700 | 32.1% | 0.254 | -0.6% | 24.8% |
| `openai/gpt-oss-120b` | **32.7** | 165 | $0.0205 | DekaLLM | [25.5%, 40.0%] | 52.7% | 51.5% | 0.811 | 23.6% | 0.300 | -9.1% | 16.4% |

## Consistency across option orders

4/4 consistency counts four valid matching responses as a percentage of attempted windows. The other columns are window counts. Incomplete means one to three valid responses; Missing means zero. Neither is counted as 4/4 consistency. This measures consistency across reordered inputs; separating order effects from variation between identical calls requires a separate control experiment.

| Model | Question | Windows | 4/4 | 3–1 | 2–1–1 | 2–2 | 1–1–1–1 | Incomplete | Missing |
|---|---|---|---|---|---|---|---|---|---|
| `google/gemini-3.8-flash` | Crowd prediction | 165 | 63.0% (104) | 44 | 7 | 10 | 0 | 0 | 0 |
| `google/gemini-3.8-flash` | Own reading | 165 | 54.5% (90) | 42 | 11 | 19 | 0 | 3 | 0 |
| `anthropic/claude-haiku-5.5` | Crowd prediction | 165 | 58.8% (97) | 51 | 4 | 13 | 0 | 0 | 0 |
| `anthropic/claude-haiku-5.5` | Own reading | 165 | 58.2% (96) | 40 | 7 | 21 | 1 | 0 | 0 |
| `z-ai/glm-5.3-flash` | Crowd prediction | 165 | 38.8% (64) | 54 | 14 | 28 | 1 | 4 | 0 |
| `z-ai/glm-5.3-flash` | Own reading | 165 | 37.0% (61) | 53 | 20 | 25 | 1 | 5 | 0 |
| `xiaomi/mimo-v2.6-flash` | Crowd prediction | 165 | 35.2% (58) | 58 | 24 | 25 | 0 | 0 | 0 |
| `xiaomi/mimo-v2.6-flash` | Own reading | 165 | 25.5% (42) | 60 | 28 | 32 | 3 | 0 | 0 |
| `deepseek/deepseek-v4.1-flash-1017` | Crowd prediction | 165 | 64.2% (106) | 40 | 5 | 11 | 0 | 3 | 0 |
| `deepseek/deepseek-v4.1-flash-1017` | Own reading | 165 | 44.2% (73) | 62 | 13 | 15 | 2 | 0 | 0 |
| `tencent/hy3` | Crowd prediction | 165 | 40.0% (66) | 57 | 18 | 23 | 1 | 0 | 0 |
| `tencent/hy3` | Own reading | 165 | 40.6% (67) | 59 | 16 | 23 | 0 | 0 | 0 |
| `z-ai/glm-5.3` | Crowd prediction | 165 | 27.9% (46) | 62 | 31 | 20 | 0 | 6 | 0 |
| `z-ai/glm-5.3` | Own reading | 165 | 35.2% (58) | 57 | 31 | 15 | 2 | 2 | 0 |
| `openai/gpt-6-luna` | Crowd prediction | 165 | 53.9% (89) | 51 | 6 | 19 | 0 | 0 | 0 |
| `openai/gpt-6-luna` | Own reading | 165 | 50.3% (83) | 48 | 15 | 19 | 0 | 0 | 0 |
| `thinkingmachines/inkling-small` | Crowd prediction | 165 | 59.4% (98) | 43 | 16 | 8 | 0 | 0 | 0 |
| `thinkingmachines/inkling-small` | Own reading | 165 | 16.4% (27) | 74 | 35 | 27 | 2 | 0 | 0 |
| `minimax/minimax-m3.1-flash` | Crowd prediction | 165 | 18.2% (30) | 60 | 34 | 35 | 3 | 3 | 0 |
| `minimax/minimax-m3.1-flash` | Own reading | 165 | 18.2% (30) | 68 | 35 | 29 | 3 | 0 | 0 |
| `openai/gpt-oss-120b` | Crowd prediction | 165 | 25.5% (42) | 61 | 35 | 21 | 5 | 1 | 0 |
| `openai/gpt-oss-120b` | Own reading | 165 | 64.2% (106) | 35 | 13 | 9 | 2 | 0 | 0 |

See [models' own interpretations](interpretations.md) for every prompt, or open [the searchable table](interpretations.html) locally. These responses do not affect the headline score.

## Baselines

- uniformly random final quadrant, accepting crowd co-winners: 25.5%
- always the most common quadrant (bl): 31.5%
- lexical heuristic, cue list in `src/score.ts`: 33.9% [27.3%, 41.2%]

## What the numbers say

- Best predictor: `google/gemini-3.8-flash` at 46.1% (random baseline 25.5%, majority baseline 31.5%).
- Spread across models: 32.7% to 46.1%, 13.3 points.
- Mean gap between a model's own reading and its prediction of the crowd: -4.0%. A positive gap means the model agrees with the crowd more often when answering for itself than when trying to predict it.
- Axis accuracy compares each predicted axis with the crowd's marginal majority on that axis. A crowd tie on an axis is omitted from that axis metric. Directional bias needs the actual choice counts as well as accuracy.

## Method

- Two questions per word: which reading did most people choose (predict), and which reading is yours (read).
- Four calls per question, each with a different cyclic option order. A unique modal answer wins: 4–0, 3–1, and 2–1–1 are resolved. A 2–2 or four-way vote tie has no final choice and scores zero. The `unstable` column counts prediction windows with a vote tie or fewer than four valid responses; it is separate from 4/4 consistency.
- All quadrants tied for the largest crowd count are accepted for prediction accuracy and own-reading agreement. The random and constant-class baselines follow the same rule. The Brier target shares probability mass equally among crowd co-winners; unresolved or missing model answers are omitted from Brier, not from attempted-window accuracy.
- Temperature 0. Prompt version and hash are written into every raw call. Confidence is used only for the Brier score.
- Confidence intervals are bootstrapped by window, 2,000 resamples. Calls within a window are not independent: the largest window contributes 1,163 marks to one question.

## Limits

- The crowd is the audience of one art project on Ethereum, not humanity. It is not a representative sample of anything.
- Prompt sensitivity is real. The prompt is frozen and hashed; a reworded sentence can move scores by ten points.
- The splits are public. A model trained on this repo can score without generalising.

