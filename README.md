# RTR-bench

[Mixed Messages](https://mixedmessages.fyi) is a generative art project that asks participants to interpret a daily prompt by placing a coordinate on a 2x2 grid, where the x-axis is Honest vs Performed, and the y-axis is Uniting vs Dividing. Across 175 windows, there have been almost 40k individual submissions. Each is a unique human data point. 

Most labeled datasets are made by asking annotators to apply a rubric. This one was not. Nobody was given a definition of honest or performed, nobody was trained, and there was no correct answer to converge on. People arrived, interpreted a prompt, placed a submission, and left. What makes the data unusual is that the crowd's answer is a distribution, rather than a label. Not "people say X", but "31% of people said this, 44% said that, and the rest said something else."

That distribution is what makes it useful for evaluating a model. Every window has a majority reading and a real minority, so a model can be scored on whether it lands with the crowd or against it, and on which axis it misreads when it does. There is also nothing here to memorize. The axes are cultural rather than factual, so no amount of training data tells a model how a crowd interpreted a prompt. The only way to get it right is for the model to understand how people would think and interpret. 

Commonly-cited benchmarks, such as [SWE-bench](https://www.swebench.com/) and [HLE](https://lastexam.ai/), are exam-like: multiple choice, math, and code. Models have been optimized for their shape. But they are very mechanical, and their results are not indicative of a model's ability to "read the room." If the industry ambition is a model that surpasses human intelligence, the comparison has to include the things humans are good at, like having cultural fluency, which models generally lack. That's why Mixed Messages provides a unique and differentiated dataset to benchmark against.

**RTR-bench**, or read-the-room, is not a knowledge test. That is deliberate. It is an attempt at a different kind of benchmark, built from a creative act rather than an exam structure. Cultural fluency resists the traditional benchmark shape, which is why this one is a prediction task that measures whether a model can anticipate how people would interpret a prompt, and whether it would have interpreted that prompt the same way, both against real human data.

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

Scoring needs no database access.

```bash
git clone https://github.com/1999labs/RTR-bench
cd RTR-bench
npm install

# keep the key in a file, not in shell history
echo 'OPENROUTER_API_KEY=sk-or-your-key' > .env

# list ids and prices
node src/cli.ts catalog --limit 20

# run a model, then score everything on disk
node src/cli.ts run --models <model-id> --concurrency 8
node src/cli.ts report
```

Once the package is published, the same run is one command with no clone:

```bash
npx rtr-bench <model-id>
```

Rebuilding the dataset needs the project's database connection, so `npm run export` is included for inspection only.

## Results

<!-- populated after the multi-model run. results/leaderboard.md is generated by `rtr-bench report`. -->

| Model | Provider | Score | Cost |
|---|---|---|---|
| z-ai/glm-5.3-flash | TBD | TBD | TBD |
| z-ai/glm-5.3 | TBD | TBD | TBD |
| minimax/minimax-m3.1-flash | TBD | TBD | TBD |
| deepseek/deepseek-v4.1-flash | TBD | TBD | TBD |
| tencent/hy4 | TBD | TBD | TBD |
| google/gemini-3.8-flash | TBD | TBD | TBD |
| google/gemini-4-carbon | TBD | TBD | TBD |
| moonshotai/kimi-k3.1-pro | TBD | TBD | TBD |
| x-ai/grok-4.7 | TBD | TBD | TBD |
| qwen/qwen3.8-max | TBD | TBD | TBD |

## License

MIT for the code. CC0 for `data/windows.json`.
