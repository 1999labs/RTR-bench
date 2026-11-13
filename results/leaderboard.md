# RTR-bench

How well does a language model predict how people read a word? 165 windows, 39,828 marks, 4 readings, 4 option orders.

## Leaderboard

| model | score /100 | n | cost | provider | 95% CI | axis x | axis y | Brier | own reading agrees | crowd distance | gap | unstable |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `google/gemini-3.8-flash` | **46.1** | 165 | $0.7790 | Google AI Studio | [38.2%, 53.3%] | 66.7% | 65.5% | 0.691 | 38.2% | 0.225 | -7.9% | 6.1% |
| `anthropic/claude-haiku-5.5` | **43.0** | 165 | $0.1694 | Claude Platform on AWS | [35.2%, 50.3%] | 63.6% | 61.2% | 0.694 | 35.2% | 0.239 | -7.9% | 7.9% |
| `z-ai/glm-5.3-flash` | **41.2** | 165 | $0.0281 | Tenstorrent | [32.7%, 48.5%] | 56.4% | 60.0% | 0.682 | 40.6% | 0.213 | -0.6% | 20.0% |
| `xiaomi/mimo-v2.6-flash` | **40.6** | 165 | $0.1216 | GMICloud | [32.7%, 47.9%] | 58.2% | 57.6% | 0.685 | 35.2% | 0.230 | -5.5% | 15.2% |
| `deepseek/deepseek-v4.1-flash-1017` | **40.0** | 165 | $0.3414 | Morph | [32.1%, 47.3%] | 60.6% | 58.8% | 0.727 | 37.0% | 0.232 | -3.0% | 8.5% |
| `tencent/hy3` | **40.0** | 165 | $0.2667 | Tencent | [32.7%, 47.3%] | 58.2% | 60.0% | 0.721 | 38.8% | 0.229 | -1.2% | 14.5% |
| `z-ai/glm-5.3` | **40.0** | 165 | $0.2828 | Tenstorrent | [32.7%, 47.3%] | 57.0% | 57.6% | 0.698 | 40.0% | 0.219 | +0.0% | 15.8% |
| `openai/gpt-6-luna` | **37.0** | 165 | $0.1329 | OpenAI | [29.7%, 44.2%] | 53.9% | 58.8% | 0.761 | 29.7% | 0.273 | -7.3% | 11.5% |
| `thinkingmachines/inkling-small` | **37.0** | 165 | $0.1733 | DeepInfra | [30.3%, 44.2%] | 53.3% | 62.4% | 0.887 | 34.5% | 0.225 | -2.4% | 4.8% |
| `openai/gpt-oss-120b` | **32.7** | 165 | $0.0205 | DekaLLM | [25.5%, 40.0%] | 52.7% | 51.5% | 0.813 | 23.6% | 0.300 | -9.1% | 16.4% |
| `minimax/minimax-m3.1-flash` | **32.1** | 165 | $0.2444 | GMICloud | [25.5%, 39.4%] | 49.1% | 46.1% | 0.712 | 30.9% | 0.254 | -1.2% | 24.8% |

See [models' own interpretations](interpretations.md) for every prompt, or open [the searchable table](interpretations.html) locally. These responses do not affect the headline score.

## Baselines

- random, 4 options: 25.0%
- always the most common quadrant (bl): 31.5%
- lexical heuristic, cue list in `src/score.ts`: 33.9% [27.3%, 41.2%]

## What the numbers say

- Best predictor: `google/gemini-3.8-flash` at 46.1% (chance 25%, majority baseline 31.5%).
- Spread across models: 32.1% to 46.1%, 13.9 points.
- Mean gap between a model's own reading and its prediction of the crowd: -4.2%. A positive gap means the model agrees with the crowd more often when answering for itself than when trying to predict it.
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

