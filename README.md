# RTR-bench

**RTR-bench** is a benchmark that scores language models on cultural fluency, built from real human data. Its source is [Mixed Messages](https://mixedmessages.fyi), a generative art project that asks participants to interpret a daily prompt by placing a coordinate on a 2x2 grid, where the x-axis is Honest vs Performed and the y-axis is Uniting vs Dividing. Across 174 closed windows there have been almost 40k individual submissions. Each one is a unique, real human data point.

Most labeled datasets are made by asking annotators to apply a rubric. This one was not. Nobody was given a definition of honest or performed, nobody was trained, and there was no correct answer to converge on. People arrived, interpreted a prompt, placed a submission, and left. What makes the data unusual is that the crowd's answer is a distribution, rather than a label. Not "people say X", but "31% of people said this, 44% said that, and the rest said something else."

That distribution is what makes it useful for evaluating a model. Every window has a dominant quadrant, so a model can be scored on whether it lands with the crowd or against it, and on which axis it misreads when it does. There is also nothing here to memorize: the axes are cultural rather than factual, so no amount of training data tells a model how a crowd interpreted a prompt. The only way to get it right is for the model to understand how people would think and interpret.

Commonly-cited benchmarks, such as [SWE-bench](https://www.swebench.com/) and [HLE](https://lastexam.ai/), measure whether a model can produce a correct answer: multiple choice, math, and code. RTR-bench measures a different subject. There is no answer key in this data, only how people actually interpreted an ambiguous prompt, so a model is scored against the crowd rather than against a key. That is what makes it a test of whether a model can read the room.

**RTR-bench** is not a knowledge test, and that is deliberate. It is a prediction task. Given a prompt, a model has to decide how the crowd interpreted it, and then decide how it would interpret it itself. Both answers are scored against the real submissions.

## How it works

[Mixed Messages](https://mixedmessages.fyi) publishes one prompt, every day. Over a 24-hour submission period, participants interpret that prompt by placing a coordinate on the grid. When the window closes, a rendering algorithm uses the (x, y) coordinates to create an artwork which depicts the day's collective interpretation. Each window has a dominant quadrant, as well as conviction and polarizations cores. The 2x2 grid gives us four possible options for the dominant quadrant, with the following implied readings and coordinates: 

| Quadrant | Reading | Coordinates | Color |
|---|---|---|---|
| Honest x Uniting | Bringing us together, authentically | x ≥ 5,000, y < 5,000 | Green |
| Honest x Dividing | Fracturing us, truthfully | x ≥ 5,000, y ≥ 5,000 | Purple |
| Performed x Uniting | Creating false unity among us | x < 5,000, y < 5,000 | Cyan |
| Performed x Dividing | Exploiting our divisions, deliberately | x < 5,000, y ≥ 5,000 | Red |

**The dataset.** 39,828 submissions across 165 of the 174 closed windows, as of November 12th. Eight windows had fewer than 25 marks, which is the floor. `data/windows.json` holds everything: the prompt, the submission counts, the dominant quadrant, the center of mass, and the conviction and polarization scores, which are not used in scoring but may be included at a later date. 

**The task.** For each window with N≥25 submissions, the model is asked to determine, given the prompt, which quadrant received the most submissions. Submission counts and dominant quadrants are never shown to the model.

**Scoring.** A right answer is one point. A wrong answer is zero points. The final score is calculated as the number of points divided by the number of prompts interpreted (165 as of 11/12/26), times 100. A score of 50 means that the model determined the correct dominant quadrant for half of the prompts. The four dominant quadrant options are rotated against four model calls so that no option gains from position. 3/4 matching answers is the model's final answer. A 2/2 split scores zero. 

## Quickstart

Scoring needs no database access, just an OpenRouter API key.

### Test a model

Node 18 or newer. No clone, no install.

```bash
mkdir rtr-run && cd rtr-run
echo 'OPENROUTER_API_KEY=sk-or-your-key' > .env

# see ids and prices. costs nothing
npx --yes rtr-bench catalog --limit 20

# run one model, then score it
npx --yes rtr-bench z-ai/glm-5.3-flash
```

`--yes` skips npx's install prompt. A run makes 1,320 calls, takes about four minutes on a cheap model, costs a few cents, and writes `results/` in the folder you created. Add `--concurrency 8` to go faster.

By default OpenRouter may route each call to any host that serves the model, and hosts differ in quantisation. List them, with price and precision:

```bash
npx --yes rtr-bench providers z-ai/glm-5.3-flash
```

Pin one with `--provider Wafer`. A pinned run refuses to fall back, and the summary names the host that served the calls.

### Work on the code

The repository runs the TypeScript sources directly, so this path needs Node 22.18 or newer.

```bash
git clone https://github.com/1999labs/RTR-bench
cd RTR-bench
npm install
echo 'OPENROUTER_API_KEY=sk-or-your-key' > .env
node src/cli.ts catalog --limit 20
node src/cli.ts run --models z-ai/glm-5.3-flash --concurrency 8
node src/cli.ts report
```

Rebuilding the dataset needs the project's database connection, so `npm run export` is included for inspection only.

## Results

| Model | Provider | Score | Cost |
|---|---|---|---|
| z-ai/glm-5.3-flash | Tenstorrent (fp8) | 41.2 | $0.0281 |
| z-ai/glm-5.3 | Tenstorrent (fp8) | 40.0 | $0.2828 |
| minimax/minimax-m3.1-flash | GMICloud (fp8) | 32.1 | $0.2444 |
| xiaomi/mimo-v2.6-flash | GMICloud (bf16) | 40.6 | $0.1216 |
| deepseek/deepseek-v4.1-flash-1017 | Morph (fp8) | 40.0 | $0.3414 |
| tencent/hy3 | Tencent (fp8) | 40.0 | $0.2665 |
| google/gemini-3.8-flash | Google AI Studio | 46.1 | $0.7790 |
| openai/gpt-6-luna | OpenAI | 37.0 | $0.1329 |
| anthropic/claude-haiku-5.5 | Claude Platform on AWS | 43.0 | $0.1696 |
| thinkingmachines/inkling-small | DeepInfra (fp8) | 37.0 | $0.1733 |
| openai/gpt-oss-120b | DekaLLM (bf16) | 32.7 | $0.0205 |

![RTR-bench: score against cost](results/leaderboard-scatter.png)

Eleven models land between 32.1 and 46.1 out of 100. Chance is 25, and a model that always names the most common quadrant scores 31.5, so nearly all of them clear the trivial floors and none comes close to reading the room. The top of the table is not a ranking either. At 165 windows the 95% intervals are about seven points wide, and gemini-3.8-flash at 46.1 overlaps claude-haiku-5.5 at 43.0 almost entirely, at four and a half times the cost.

Where they fail is more interesting than where they land. Across 1,591 answers, the models name honest+uniting 67.7% of the time and honest+dividing 18.2% of the time. Division is read as spin or as bad faith, almost never as candour. Six of the seven windows no model got right are honest+dividing, including Donald Trump and Elon Musk, where the crowd itself agreed 86% and 70%. The seventy-eight-cent model and the models under twenty cents miss the same quadrant.

The whole table cost $2.56 to produce. Cost barely relates to score: two cents buys 32.7, seventeen cents buys 43.0, seventy-eight cents buys 46.1.

## License

MIT for the code. CC0 for `data/windows.json`.
