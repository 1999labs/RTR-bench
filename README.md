# RTR-bench

[Mixed Messages](https://mixedmessages.fyi) is a generative art project that asks participants to interpret a daily prompt by placing a coordinate on a 2x2 grid, where the x-axis is Honest vs Performed, and the y-axis is Uniting vs Dividing. Across 175 windows, there have been almost 40k individual submissions. Each is a unique human data point. 

Most labeled datasets are made by asking annotators to apply a rubric. This one was not. Nobody was given a definition of honest or performed, nobody was trained, and there was no correct answer to converge on. People arrived, interpreted a prompt, placed a submission, and left. What makes the data unusual is that the crowd's answer is a distribution, rather than a label. Not "people say X", but "31% of people said this, 44% said that, and the rest said something else."

That distribution is what makes it useful for evaluating a model. Every window has a majority reading and a real minority, so a model can be scored on whether it lands with the crowd or against it, and on which axis it misreads when it does. There is also nothing here to memorize. The axes are cultural rather than factual, so no amount of training data tells a model how a crowd interpreted a prompt. The only way to get it right is for the model to understand how people would think and interpret. 

Commonly-cited benchmarks, such as [SWE-bench](https://www.swebench.com/) and [HLE](https://lastexam.ai/), are exam-like: multiple choice, math, and code. Models have been optimized for their shape. But they are very mechanical, and their results are not indicative of a model's ability to "read the room." If the industry ambition is a model that surpasses human intelligence, the comparison has to include the things humans are good at, like having cultural fluency, which models generally lack. That's why Mixed Messages provides a unique and differentiated dataset to benchmark against.

**RTR-bench**, or read-the-room, is not a knowledge test. That is deliberate. It is an attempt at a different kind of benchmark, built from a creative act rather than an exam structure. Cultural fluency resists the traditional benchmark shape, which is why this one is a prediction task that measures whether a model can anticipate how people would interpret a prompt, and whether it would have interpreted that prompt the same way, both against real human data.

## The result, so far

One model. 165 of the 174 closed windows clear the 25-mark floor: 39,828 marks, four option orders per question.

| measure | score |
|---|---|
| score (out of 100) | 43.0 [35.2, 50.3] |
| chance | 25.0 |
| always the most common answer | 31.5 |
| keyword heuristic | 33.9 [27.3, 41.2] |
| axis: uniting vs dividing | 60.6 |
| axis: performed vs honest | 57.0 |
| own reading matches the crowd | 37.0 |
| no stable answer across four orders | 15.8 |

Four things worth saying about that.

**It clears chance easily.** 43.0 against 25 on a four-way choice, and the bottom of its interval is ten points above chance. Word choice carries real signal about crowd placement.

**It clears the majority-answer baseline, but only just.** Paired difference +11.5 points, 95% interval [1.2, 21.2]. Real, thin, and entirely a consequence of 165 windows.

**It does not beat a keyword list.** The hand-written cue list scores 33.9. The paired difference is +9.1 points with an interval of [-0.6, 18.8]. At this sample size a cheap language model and a list of negative words are not distinguishable. Anyone claiming a leaderboard from this dataset is measuring noise.

**The bias is directional, and it is the only finding here that does not depend on a significance test.** On the 139 windows where the model gave a stable answer, it predicted `honest+uniting` 42 times where the field chose it 31, and predicted `honest+dividing` 22 times where the field chose it 34. It reads "fracturing us, truthfully" as "bringing us together, authentically." The model believes the room agreed more than the room did.

The instability number sets the ceiling on everything else. 26 of 165 windows (15.8%) produce no stable answer when the same four options are reordered, and those score zero. That is the instrument's own noise floor, and it is larger than any difference a single-model run could claim.

The sample size follows from that. The paired interval on the difference from the keyword list is 19.4 points wide. Halving it needs four times the windows, roughly 660. A real leaderboard needs more than 165 questions, or several samples per question, before the ordering of two models means anything.

## The field

165 closed windows. 39,828 marks, between 44 and 1,163 per window, median 192.

| plurality | windows |
|---|---|
| performed+dividing | 52 |
| honest+dividing | 39 |
| performed+uniting | 37 |
| honest+uniting | 37 |

There is no dominant answer, which is why the majority baseline is only 31.5%. A four-way task with a balanced target is a harder task than a four-way task with a common answer.

## The two questions

**Predict.** Given the word and the four readings, which reading did most people choose?

**Read.** Given the word and the four readings, which reading is yours?

The second question is what makes the gap possible. A model that predicts the crowd well but reads the word differently is doing something more interesting than a model that simply agrees with people.

Each question is asked four times per window, with the four options rotated. Every option sits in every position once. The modal answer across the four is the model's answer. A 2-2 split is not a modal answer: it scores as a miss and sets the `unstable` flag. That rule is conservative on purpose, because the alternative is choosing a tie-break and letting it decide the leaderboard.

## Method

- Temperature 0, reasoning effort `low` where the model accepts it. Both are recorded in every raw call.
- The prompt is frozen at `v1` and hashed. The hash is written into every raw file.
- Strict JSON output: `{"quadrant": "...", "confidence": 0.0-1.0}`.
- Confidence is used only for the Brier score. It does not affect accuracy.
- Accuracy intervals are bootstrapped by window, 2,000 resamples. Calls inside a window are not independent, and the largest window carries 1,163 marks on one question.
- The scorer never reads the site. It reads `data/windows.json`, which is exported read-only from Postgres, plus the raw call files.

## Limits

- **One model in the checked-in run.** The OpenRouter balance ran out at $0.005 after the first full sweep. The other nine ids in `models.txt` are listed but unrun. Do not read this as a leaderboard yet.
- **The field includes marks placed by the project owner** to seed sparse windows. By the owner's decision the benchmark uses every mark in the field and reports no split. The split is recorded in `data/audit.json` for anyone who wants it; no score uses it.
- **165 windows is small for a four-way task.** Every accuracy number carries its interval, and the intervals are wide.
- **Prompt sensitivity is real.** One reworded sentence can move scores by ten points. The prompt is versioned and hashed and should not change mid-leaderboard.
- **The splits are public.** A model trained on this repo can score without generalising. A held-back set with a published hash is the fix, and it is not built yet.
- **The instability floor is 15.8%** on the one model measured. That is not a property of the task, it is a property of the calls. Any comparison tighter than that is noise.

## How the score works

Each window is one question with four possible answers. The model scores one point if it picks the answer that most marks in that window chose.

It answers each question four times, with the four options rotated so no option gets the advantage of position. Three or four matching answers is the model's answer. A 2-2 split is no answer and scores zero.

The score is points divided by questions, times 100, so it is always out of 100:

- 165 questions: each question is worth 0.61 points.
- 500 questions: each is worth 0.2.
- The scale never changes. More windows do not make the score larger or smaller, they make it more precise.

Chance is 25. Always answering the most common reading is 31.5. The interval beside the score is the range it would land in on a different sample of windows, so 43.0 with an interval of 35 to 50 means the true value sits somewhere in that band.

## Reproduce

Scoring a model needs no database access: `data/windows.json` is in the repo.

### Run your own model

```bash
git clone https://github.com/1999labs/RTR-bench
cd RTR-bench
npm install

# put your own key in a file, not in shell history
echo 'OPENROUTER_API_KEY=sk-or-your-key' > .env

# list ids and prices
node src/cli.ts catalog --limit 20

# run any model on the catalogue
node src/cli.ts run --models <model-id> --concurrency 8
node src/cli.ts report
```

The key is read from `.env` or from the environment. It is never written into results. `report` scores every model directory on disk, so several people can contribute runs and the leaderboard is just the set of folders in `results/raw/`.

### Rebuild the dataset

This needs the project's own Postgres connection, so it is not reproducible by a stranger. It is included so the export can be audited.

```bash
npm run export
```

The human baseline is a static page. Open `human/index.html`, answer 21 words, and send back the CSV. Score any number of them together:

```bash
node scripts/score-human.mjs human/alice.csv human/bob.csv
```

## Files

```
data/windows.json       165 windows: word, counts, plurality, centroid, conviction, polarization
data/audit.json         how many marks in each window came from the public submit path (not scored)
src/prompt.ts           the frozen prompt, the four orders, the parser
src/run.ts              OpenRouter runner, one JSON file per call, resumable
src/score.ts            metrics, baselines, bootstrap intervals
src/report.ts           results/leaderboard.md and results/leaderboard.svg
src/cli.ts              catalog / run / score / report
src/env.ts              loads .env so a key never has to sit in shell history
human/index.html        the human baseline instrument
scripts/export.mjs      read-only export from Postgres plus getWord on mainnet
scripts/score-human.mjs scores returned human CSVs
results/raw/<model>/    every call, verbatim
```

## License

MIT for the code. CC0 for `data/windows.json`.
