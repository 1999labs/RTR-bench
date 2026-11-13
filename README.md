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

Eleven models were tested against the same 165 windows, representing 39,828 human submissions. Scores ranged from 32.1 to 46.1, compared with 31.5 for always choosing the most common quadrant and 33.9 for a simple lexical heuristic. Gemini scored highest, correctly predicting 76 of the 165 windows. Its bootstrapped 95% confidence interval was 38.2–53.3%, however, so small differences between models should be treated cautiously.

Perhaps the value of the benchmark lies more in exposing model behavior than in actually ranking models. As described above, benchmarks such as HLE and SWE-bench evaluate whether a model can answer an expert question or resolve a software issue against defined criteria. RTR-bench asks whether a model can anticipate how a particular crowd interpreted something ambiguous. An incorrect prediction does not establish that the model’s interpretation is unreasonable. It shows where that interpretation departs from the room.

The clearest shared departure was Honest × Dividing. This was the crowd’s dominant quadrant in 39 of 165 windows, or 23.6%. Across the models’ 1,591 final predictions without a tie between option orders, however, they selected it only 160 times, or 10.1%. Including tied predictions as misses, models correctly identified just 15.9% of the windows dominated by Honest × Dividing, compared with 60.7% for Honest × Uniting. The models were much better at anticipating authentic unity than anticipating division that participants interpreted as honest.

Donald Trump and Elon Musk illustrate both the pattern and the limits of the current score. None of the eleven models correctly predicted the dominant quadrant for either Trump’s window or either of Musk’s two windows. For Trump, 634 of 738 submissions—85.9%—landed in Honest × Dividing. In the first Musk window, the same quadrant won with only 278 of 720 submissions, or 38.6%, narrowly ahead of Performed × Dividing at 34.7%. Both count as an incorrect prediction, although one misses an overwhelming consensus and the other misses a closely divided crowd. At the other end, all eleven models correctly predicted Handwritten Notes, The CIA, and Altruism.

These results return to what makes the source data unusual: the crowd’s answer is a distribution. The current score reduces that distribution to its largest quadrant, making comparison straightforward while leaving much of the disagreement unmeasured. My main takeaway is that these models share a difficulty anticipating when this audience reads division as honest. Establishing how broadly that pattern holds will require more audiences, prompt variants, and future windows. Next, I would like to test more frontier models, report performance separately where the crowd was decisive, and evaluate predictions of the full distribution alongside the dominant-quadrant score. Conviction and polarization could then help describe the kinds of disagreement a model understands, and the kinds it consistently misreads.

## License

MIT for the code. CC0 for `data/windows.json`.
