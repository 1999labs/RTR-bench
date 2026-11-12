# RTR-bench

[Mixed Messages](https://mixedmessages.fyi) is a generative art project that asks participants to interpret a daily prompt by placing a coordinate on a 2x2 grid, where the x-axis is Honest vs Performed, and the y-axis is Uniting vs Dividing. Across 175 windows, there have been almost 40k individual submissions. Each is a unique human data point. 

Most labeled datasets are made by asking annotators to apply a rubric. This one was not. Nobody was given a definition of honest or performed, nobody was trained, and there was no correct answer to converge on. People arrived, interpreted a prompt, placed a submission, and left. What makes the data unusual is that the crowd's answer is a distribution, rather than a label. Not "people say X", but "31% of people said this, 44% said that, and the rest said something else."

That distribution is what makes it useful for evaluating a model. Every window has a majority reading and a real minority, so a model can be scored on whether it lands with the crowd or against it, and on which axis it misreads when it does. There is also nothing here to memorize. The axes are cultural rather than factual, so no amount of training data tells a model how a crowd interpreted a prompt. The only way to get it right is for the model to understand how people would think and interpret. 

Commonly-cited benchmarks, such as [SWE-bench](https://www.swebench.com/) and [HLE](https://lastexam.ai/), are exam-like: multiple choice, math, and code. Models have been optimized for their shape. But they are very mechanical, and their results are not indicative of a model's ability to "read the room." If the industry ambition is a model that surpasses human intelligence, the comparison has to include the things humans are good at, like having cultural fluency, which models generally lack. That's why Mixed Messages provides a unique and differentiated dataset to benchmark against.

**RTR-bench**, or read-the-room, is not a knowledge test. That is deliberate. It is an attempt at a different kind of benchmark, built from a creative act rather than an exam structure. Cultural fluency resists the traditional benchmark shape, which is why this one is a prediction task that measures whether a model can anticipate how people would interpret a prompt, and whether it would have interpreted that prompt the same way, both against real human data.

## How it works

[Mixed Messages](https://mixedmessages.fyi) publishes one prompt, every day. Over a 24-hour submission period, participants interpret that prompt by placing a coordinate on the grid. When the window closes, a rendering algorithm uses the (x, y) coordinates to create an artwork which depicts the day's collective interpretation. Each window has a dominant quadrant, as well as conviction and polarizations cores. The grid is a 10,000 x 10,000 canvas, so one interpretation answers two questions at once: 

| Axis | 0 | 10,000 |
|---|---|---|
| x | Performed | Honest |
| y | Uniting | Dividing |

The 2x2 grid gives us four possible options for the dominant quadrant, with the following implied readings: 

| Quadrant | Reading |
|---|---|
| Honest x Uniting | Bringing us together, authentically |
| Honest x Dividing | Fracturing us, truthfully |
| Performed x Uniting | Creating false unity among us |
| Performed x Dividing | Exploiting our divisions, deliberately |

**The dataset.** 39,828 submissions across 165 of the 174 closed windows, as of November 12th. Eight windows had fewer than 25 marks, which is the floor. `data/windows.json` holds everything: the prompt, the submission counts, the dominant quadrant, the center of mass, and the conviction and polarization scores, which are not used in scoring but may be included at a later date. 

**The task.** Each window poses two questions. The first asks the model to determine, given the prompt, which quadrant received the most submissions. The second asks the model for its own interpretation. That is what makes the gap measurable, since a model can predict human interpretation and still interpret the prompt differently. Submission counts and dominant quadrants are never shown to the model, and the four options are rotated against four model calls so that no option gains from position. 3/4 matching answers is the model's final answer. A 2/2 split scores zero. 

## Scoring

Scoring is a quiz with 165 questions. Each one is a prompt and four possible dominant quadrants, and the question is which one the crowd picked most. A right answer is one point, a wrong answer is nothing.

The score is points divided by questions, times 100. All 165 right is 100. A score of 43 means about 71 right.

Three numbers to read it against:

| | |
|---|---|
| guessing at random | 25 |
| always answering the most common quadrant | 31.5 |
| a hand-written keyword list | 33.9 |

Each question is asked four times, with the four options shuffled, because models tend to favour whichever option comes first. Three or four matching answers is the model's answer. A 2-2 split counts as wrong.

The score comes with a 95% interval: the range it would land in on a different set of 165 windows. A score of 43 with an interval of 35 to 50 means the true value sits inside that band, which is why a four-point gap between two models means very little.

The gap is the second question. Instead of guessing the crowd, the model is asked for its own reading. The gap is how often that reading matches the crowd, minus how often its prediction does. A model can predict the crowd well and still read the prompt differently, and the gap measures that difference.

One caveat: the prompt is frozen and hashed into every raw call, but the windows are public, so a model trained on this repo could score without generalising.

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

`report` scores every folder in `results/raw/`, so several people can contribute runs and the leaderboard is the union of them.

The human baseline is a static page. Open `human/index.html`, answer 21 words, send back the CSV, then score any number of them together:

```bash
node scripts/score-human.mjs human/alice.csv human/bob.csv
```

To rebuild the dataset from source you need the project's Postgres connection, so that step is not reproducible by a stranger. It is included so the export can be audited: `npm run export`.

## Results

<!-- populated after the multi-model run. results/leaderboard.md is generated by `rtr-bench report`. -->

## License

MIT for the code. CC0 for `data/windows.json`.
