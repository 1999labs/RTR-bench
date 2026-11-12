# read-the-room

Mixed Messages asks a crowd to place a word on a grid: uniting or dividing on one axis, performed or honest on the other. Every mark in a window becomes one artwork, and every window keeps the shape of how the crowd read that word.

This repo asks a narrower question. Given only the word, can a language model predict where the crowd lands? And where does the model's own reading differ from the crowd's?

## The result, so far

One model, 164 windows, 39,784 marks, four option orders per question.

| measure | score |
|---|---|
| score (out of 100) | 42.7 [36.0, 50.0] |
| chance | 25.0 |
| always the most common answer | 31.7 |
| keyword heuristic | 34.1 [26.8, 41.5] |
| axis: uniting vs dividing | 60.4 |
| axis: performed vs honest | 56.7 |
| own reading matches the crowd | 36.6 |
| no stable answer across four orders | 15.9 |

Four things worth saying about that.

**It clears chance easily.** 42.7% against 25% on a four-way choice, and the bottom of its interval is eleven points above chance. Word choice carries real signal about crowd placement.

**It clears the majority-answer baseline, but only just.** Paired difference +11.0 points, 95% interval [1.2, 20.7]. Real, thin, and entirely a consequence of 164 windows.

**It does not beat a keyword list.** The hand-written cue list scores 34.1%. The paired difference is +8.5 points with an interval of [-1.2, 18.3]. At this sample size a cheap language model and a list of negative words are not distinguishable. Anyone claiming a leaderboard from this dataset is measuring noise.

**The bias is directional, and it is the only finding here that does not depend on a significance test.** On the 138 windows where the model gave a stable answer, it predicted `honest+uniting` 41 times where the field chose it 30, and predicted `honest+dividing` 22 times where the field chose it 34. It reads "fracturing us, truthfully" as "bringing us together, authentically." The model believes the room agreed more than the room did.

The instability number sets the ceiling on everything else. 26 of 164 windows (15.9%) produce no stable answer when the same four options are reordered, and those score zero. That is the instrument's own noise floor, and it is larger than any difference a single-model run could claim.

The sample size follows from that. The paired interval on the difference from the keyword list is 19.5 points wide. Halving it needs four times the windows, roughly 650. A real leaderboard needs more than 164 questions, or several samples per question, before the ordering of two models means anything.

## The field

164 closed windows. 39,784 marks, between 52 and 1,163 per window, median 198.

| plurality | windows |
|---|---|
| performed+dividing | 52 |
| honest+dividing | 39 |
| performed+uniting | 37 |
| honest+uniting | 36 |

There is no dominant answer, which is why the majority baseline is only 31.7%. A four-way task with a balanced target is a harder task than a four-way task with a common answer.

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
- **164 windows is small for a four-way task.** Every accuracy number carries its interval, and the intervals are wide.
- **Prompt sensitivity is real.** One reworded sentence can move scores by ten points. The prompt is versioned and hashed and should not change mid-leaderboard.
- **The splits are public.** A model trained on this repo can score without generalising. A held-back set with a published hash is the fix, and it is not built yet.
- **The instability floor is 15.9%** on the one model measured. That is not a property of the task, it is a property of the calls. Any comparison tighter than that is noise.

## How the score works

Each window is one question with four possible answers. The model scores one point if it picks the answer that most marks in that window chose.

It answers each question four times, with the four options rotated so no option gets the advantage of position. Three or four matching answers is the model's answer. A 2-2 split is no answer and scores zero.

The score is points divided by questions, times 100, so it is always out of 100:

- 164 questions: each question is worth 0.61 points.
- 500 questions: each is worth 0.2.
- The scale never changes. More windows do not make the score larger or smaller, they make it more precise.

Chance is 25. Always answering the most common reading is 31.7. The interval beside the score is the range it would land in on a different sample of windows, so 42.7 with an interval of 36 to 50 means the true value sits somewhere in that band.

## Reproduce

Scoring a model needs no database access: `data/windows.json` is in the repo.

### Run your own model

```bash
git clone https://github.com/1999labs/read-the-room-bench
cd read-the-room-bench
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
data/windows.json       164 windows: word, counts, plurality, centroid, conviction, polarization
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
