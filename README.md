# RTR-bench

[Mixed Messages](https://mixedmessages.fyi) is a generative art project that asks participants to interpret a daily prompt by placing a coordinate on a 2x2 grid, where the x-axis is Honest vs Performed, and the y-axis is Uniting vs Dividing. Across 175 windows, there have been almost 40k individual submissions. Each is a unique human data point. 

Most labeled datasets are made by asking annotators to apply a rubric. This one was not. Nobody was given a definition of honest or performed, nobody was trained, and there was no correct answer to converge on. People arrived, interpreted a prompt, placed a submission, and left. What makes the data unusual is that the crowd's answer is a distribution, rather than a label. Not "people say X", but "31% of people said this, 44% said that, and the rest said something else."

That distribution is what makes it useful for evaluating a model. Every window has a majority reading and a real minority, so a model can be scored on whether it lands with the crowd or against it, and on which axis it misreads when it does. There is also nothing here to memorize. The axes are cultural rather than factual, so no amount of training data tells a model how a crowd interpreted a prompt. The only way to get it right is for the model to understand how people would think and interpret. 

Commonly-cited benchmarks, such as [SWE-bench](https://www.swebench.com/) and [HLE](https://lastexam.ai/), are exam-like: multiple choice, math, and code. Models have been optimized for their shape. But they are very mechanical, and their results are not indicative of a model's ability to "read the room." If the industry ambition is a model that surpasses human intelligence, the comparison has to include the things humans are good at, like having cultural fluency, which models generally lack. That's why Mixed Messages provides a unique and differentiated dataset to benchmark against.

**RTR-bench**, or read-the-room, is not a knowledge test. That is deliberate. It is an attempt at a different kind of benchmark, built from a creative act rather than an exam structure. Cultural fluency resists the traditional benchmark shape, which is why this one is a prediction task that measures whether a model can anticipate how people would interpret a prompt, and whether it would have interpreted that prompt the same way, both against real human data.

## How it works

[Mixed Messages](https://mixedmessages.fyi) publishes one prompt, every day. Over a 24-hour submission period, participants interpret that prompt by placing a coordinate on the grid. When the window closes, a rendering algorithm uses the (x, y) coordinates to create an artwork which depicts the day's collective interpretation. Each window has a dominant quadrant, as well as conviction and polarizations cores. The grid is a 10,000 x 10,000 canvas, so one interpretation answers two questions at once: 

| axis | 0 | 10,000 |
|---|---|---|
| x | performed | honest |
| y | uniting | dividing |

The 2x2 grid gives us four possible options for the dominant quadrant, with the following implied readings: 

| quadrant | reading |
|---|---|
| performed + uniting | creating false unity among us |
| honest + uniting | bringing us together, authentically |
| performed + dividing | exploiting our divisions, deliberately |
| honest + dividing | fracturing us, truthfully |

**The data.** 165 of the 174 closed windows, 39,828 marks, between 44 and 1,163 per window. Eight windows have fewer than 25 marks and one closed with none. A plurality decided by two marks is one person's opinion, so those are out. `data/windows.json` holds every question: the word, the four counts, the plurality, the crowd's centre of mass, and two summary numbers, conviction and polarization. Scoring needs no database.

The field includes marks placed by the project owner to seed sparse windows. The benchmark uses every mark and reports no split. `data/audit.json` records how many marks in each window came from the public submit path; no score reads it.

**The task.** Each window is one question: given the word and the four readings, which one did the crowd choose most? The winner is the plurality, which is often not a majority. In 39 of the 165 windows no reading took half the marks.

A second question asks the model for its own reading. That is what makes the gap measurable, since a model can predict the crowd and still read the word differently.

The crowd's answer is never shown to the model, and the four options are rotated across four calls so no option gains from position. Three or four matching answers is the model's answer. A 2-2 split is no answer and scores zero.

## Scoring

One window is one point. The score is points divided by questions, times 100, so it is always out of 100 and does not change scale as the dataset grows.

| reference point | score |
|---|---|
| chance | 25 |
| always the most common reading | 31.5 |
| hand-written keyword list | 33.9 |

The leaderboard also reports:

| column | what it means |
|---|---|
| n | windows the model answered |
| 95% CI | range the score would land in on a different sample of windows, bootstrapped by window |
| axis x, axis y | accuracy on each axis separately, to show which one a model misreads |
| Brier | calibration of the stated confidence |
| own reading agrees | how often the model's own reading matches the crowd |
| crowd distance | distance between that reading and the crowd's centre of mass |
| gap | own reading agreement minus prediction accuracy |
| unstable | share of windows with no stable answer |

Two rules matter. A 2-2 split scores zero rather than being broken by a tie-break, so accuracy is a lower bound. And intervals are bootstrapped by window, not by call, because calls inside a window are not independent.

The prompt is frozen at `v1` and hashed into every raw call. The windows are public, so a model trained on this repo can score without generalising; a held-back set is not built yet. Intervals are wide because 165 questions is a small sample.

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
