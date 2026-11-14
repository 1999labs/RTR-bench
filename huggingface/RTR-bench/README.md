---
pretty_name: RTR-bench
language:
- en
license: cc0-1.0
size_categories:
- n<1K
task_categories:
- other
tags:
- benchmark
- evaluation
- cultural-fluency
- crowd-distributions
- agent-evaluation
- mixed-messages
configs:
- config_name: default
  default: true
  data_files:
  - split: reference
    path: data/reference.jsonl
  - split: development
    path: data/development.jsonl
  - split: evaluation
    path: data/evaluation.jsonl
---

# RTR-bench

**Can a model learn how a particular audience interprets the world?** RTR-bench evaluates predictions of audience interpretations using responses collected by [Mixed Messages](https://mixedmessages.fyi), a generative art project. Participants place a coordinate on a two-axis grid in response to a daily word or phrase. The axes are **Honest ↔ Performed** and **Uniting ↔ Dividing**.

This release contains **165 prompt windows representing 39,828 submissions**. One row is one aggregate prompt window, not one person or submission. The outcomes describe the Mixed Messages audience, not objectively correct meanings or a representative sample of the general population.

**Learn the Room** is the interactive track: a model chooses historical examples to inspect, then predicts the audience's response to a new target. **Distribution Prediction** measures the same prediction ability without examples and supplies its essential control. The original RTR winning-quadrant benchmark is also supported by the same data, with a separate scoring protocol.

[Code and runners](https://github.com/1999labs/RTR-bench) · [Learn the Room protocol](https://github.com/1999labs/RTR-bench/blob/644d481d335af9a632c7ed0599108b13e4a5653e/docs/learn-room.md) · [Distribution protocol](https://github.com/1999labs/RTR-bench/blob/644d481d335af9a632c7ed0599108b13e4a5653e/docs/distribution.md) · [First final results](https://github.com/1999labs/RTR-bench/blob/644d481d335af9a632c7ed0599108b13e4a5653e/results/learn-room/z-ai-glm-5-3-flash-e9d0327447ef1856/README.md)

## Tasks

### Learn the Room

Each episode starts with a target prompt and a fresh conversation. The target's recorded crowd response remains hidden from the model.

1. The model can request a catalog of the **90 reference prompt names and IDs**, without their labels.
2. It selects a reference to inspect and receives that reference's quadrant distribution and submission count.
3. It can use that observation to choose another reference, up to **three distinct inspections**, or stop early.
4. It submits four probabilities for the target, summing to one.

The default environment allows eight actions and eight model turns. The model receives no target score or correctness feedback during an episode. Learning is within the conversation; there is no weight update or memory carried between target episodes.

Report the agent's score **and its paired gain against no examples**. Random-example and text-similarity conditions are comparison controls, not separate benchmark tracks. The similarity control uses a frozen lexical TF–IDF method, not an embedding model. Agent selection and evidence use are evaluated together; differences also include the agent's extra inference compute and multi-turn instructions.

The first final run used the explicit `transfer-check-v1` policy, which asks the model to assess whether historical evidence transfers on each axis and to discount weak analogies. The original CLI policy remains the default; always identify the policy and settings when comparing results.

### Distribution Prediction

Given only the target, audience description, and quadrant definitions, estimate the fraction of audience responses in each quadrant. Example output format, with illustrative values:

```json
{
  "performed+uniting": 0.10,
  "honest+uniting": 0.50,
  "performed+dividing": 0.25,
  "honest+dividing": 0.15
}
```

The model outputs proportions, not a single winning label or its own preference. Learn the Room's no-example condition uses the same messages and scorer, so it can supply this result without duplicate model calls.

### Original RTR: winning-quadrant prediction

Predict a quadrant with the largest crowd count; a second question asks for the model's own interpretation. Each question uses four cyclic option orders. The headline score is the percentage of crowd-prediction windows answered correctly after a unique modal vote; unresolved model-vote ties score zero. Accept **any crowd co-winner**, not only the legacy single `dominant` field. The original benchmark uses all 165 windows; the 90/30/45 partition belongs to the two new tracks. See the [original protocol](https://github.com/1999labs/RTR-bench/blob/644d481d335af9a632c7ed0599108b13e4a5653e/README.md) for complete failure, tie, and consistency rules.

## Data and collection

The source snapshot was exported on **2026-11-12 at 06:20:26 UTC**. It includes closed Mixed Messages windows among days 1–174 that have at least 25 submissions: 165 windows with an observed minimum of 44, median of 192, and maximum of 1,163 submissions. The other nine days are excluded by the source snapshot's inclusion rule. Day numbers are project window IDs, not calendar dates.

Every recorded mark in an included window contributes to its counts. Participants were not trained annotators and were not instructed to converge on a correct answer. This release does not provide respondent demographics, unique-person counts, or individual-level placements. It contains aggregate counts, distributions, and summary measures only. No participant identifiers or wallet addresses are included in the row export; the original source metadata includes the public project contract address.

| Canonical quadrant | Audience reading | Source count key | Original coordinate rule |
|---|---|---|---|
| `performed+uniting` | Creating false unity among us | `tl` | x < 5000, y < 5000 |
| `honest+uniting` | Bringing us together, authentically | `tr` | x ≥ 5000, y < 5000 |
| `performed+dividing` | Exploiting our divisions, deliberately | `bl` | x < 5000, y ≥ 5000 |
| `honest+dividing` | Fracturing us, truthfully | `br` | x ≥ 5000, y ≥ 5000 |

## Frozen splits

| Hugging Face split | Days | Rows | Intended use |
|---|---|---:|---|
| `reference` | Included days 1–99 | 90 | Historical evidence pool and constant baseline |
| `development` | 100–129 | 30 | Implementation and prompt development |
| `evaluation` | 130–174 | 45 | Evaluation after settings are frozen |

There is **no training split** in this protocol. All reference windows precede all targets. The boundaries were chosen by chronology, not crowd labels. Both Elon Musk windows (days 30 and 99) remain in reference. The split manifest records entity grouping and the dataset fingerprint.

**Target labels are public in these files for scoring, but must not be passed into model prompts or unrestricted agent retrieval.** Only the reference catalog and permitted inspected reference outcomes may enter the agent's context. Development outcomes never become reference evidence. Loading a dataset row is not itself a compliant evaluation environment; use the linked runner to enforce that boundary.

The data were public and used in the original RTR benchmark before these new partitions were defined. The final split has now been evaluated with GLM 5.3 Flash. It is a holdout from that development process, not a claim of unseen model training data. Any later tuning informed by these outcomes must disclose that exposure.

## Loading

After publication, load all three splits with Hugging Face Datasets:

```python
from datasets import load_dataset

room = load_dataset("noahmclaughlin/RTR-bench")
reference = room["reference"]       # 90 rows
development = room["development"] # 30 rows
evaluation = room["evaluation"]   # 45 rows
```

For the original 165-window benchmark, concatenate the three splits in chronological order:

```python
from datasets import concatenate_datasets

all_windows = concatenate_datasets([
    room["reference"], room["development"], room["evaluation"]
])
```

Pin a Hugging Face commit with `revision="<dataset-commit>"` when publishing results. The human-readable JSONL files also work without the Datasets library. The byte-identical original source and split manifest are included under `source/` for compatibility with the Node.js runners.

## Row schema

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable window ID, e.g. `mm-001` |
| `day` | integer | Original Mixed Messages window ID |
| `prompt` | string | Original prompt text, preserving case |
| `partition` | string | `reference`, `development`, or `evaluation` |
| `submission_count` | integer | Number of recorded marks in this window |
| `count_performed_uniting`, `count_honest_uniting`, `count_performed_dividing`, `count_honest_dividing` | integer | Four nonnegative counts, summing to `submission_count` |
| `share_performed_uniting`, `share_honest_uniting`, `share_performed_dividing`, `share_honest_dividing` | float | Corresponding count divided by `submission_count`, without display rounding |
| `winning_quadrants` | list of strings | All canonical quadrant labels tied for the maximum count |
| `winning_share` | float | Maximum count divided by `submission_count` |
| `centroid_x`, `centroid_y` | float | Original rounded mean coordinates, normalized to approximately [0, 1] |
| `conviction` | float | Original rounded mean distance from the grid center, divided by 7071 and multiplied by 100 |
| `polarization` | float | Original rounded RMS distance from the centroid, divided by 7071 and multiplied by 100 |

There are three crowd-winner ties: Republicans (day 60), Police Departments (68), and Freedom (83). The original source contains a legacy single winner and rounded winning share; this export derives **all co-winners and full-precision shares from integer counts**. Conviction, polarization, and centroid fields are descriptive and do not enter the current scores.

## Scoring the two distribution tasks

For target probabilities `p` and observed shares `y`, the error is the sum of `(p[q] - y[q])²` over the four quadrants. Average errors equally across declared targets, then compute:

```text
score = 100 × (1 − mean_error / 2)
agent_gain = agent_score − no_example_score
```

A score of 100 is an exact distribution match. These scores are **not percentage accuracy**, and 50 is not a chance baseline. Report uniform and constant-reference predictions on the same targets. The constant baseline averages the 90 reference-window distributions equally, rather than pooling their submissions.

Predictions must contain exactly the four canonical keys and finite numbers between zero and one. Sums within 0.001 of one are normalized; other invalid or missing terminal predictions receive zero and remain in the denominator. Pending targets keep a run incomplete. Saved requests, responses, costs, and traces support offline replay. The protocol documents the bounded transport retries and agent action recovery rules.

## Initial final results

One GLM 5.3 Flash run through Relace, using all 45 evaluation targets, temperature 0, a 4,000-token allowance, seed 7, and agent policy `transfer-check-v1`:

| Result | Score / 100 | Gain vs no examples |
|---|---:|---:|
| **Learn the Room: agent** | **85.57** | **-2.37** |
| **Distribution Prediction / no examples** | **87.93** | — |
| Control: random examples | 86.47 | -1.46 |
| Control: text-similar examples | 85.43 | -2.51 |
| Constant reference distribution | 85.56 | — |
| Uniform distribution | 85.39 | — |

All 180 predictions were valid. The agent's exploratory paired 95% interval against no examples was **-5.14 to +0.12 points**. This run demonstrated no average benefit from gathering examples; a score in the mid-80s is close to simple baselines on this split. The interval resamples target entity groups, is not corrected for multiple comparisons, and does not measure variability across repeated model runs. These are one model's results on one audience, not a general model ranking. See the linked final report for complete records and settings.

## Running the benchmark

The data are usable independently of any model provider. The current reference CLI uses OpenRouter for paid model calls; support for other endpoints is not yet implemented. To verify the environment locally with **zero API calls**, use Node.js 22.18 or newer:

```bash
git clone https://github.com/1999labs/RTR-bench.git
cd RTR-bench
git checkout 644d481d335af9a632c7ed0599108b13e4a5653e
npm ci
node src/cli.ts learn-room --fixture tests/fixtures/learn-room-four-strategies.json --strategy all --limit 5 --max-tokens 4000 --agent-policy transfer-check-v1
```

The fixture results are synthetic and are not model performance. The code repository contains the scoring, interactive environment, CLI, tests, and report generation. This Hub repository distributes data and documentation; it does not automatically execute or host an evaluation service.

## Limitations and intended use

- The audience is self-selected through an art project; its demographics and representativeness are not established here.
- Submission counts do not establish unique participants. Repeated prompts and correlated audience behavior mean submissions are not independent evaluation tasks.
- There are only 45 final windows, so small differences and subgroup conclusions are uncertain.
- Chronological partitions can reflect audience or cultural changes over time.
- The reference pool may offer weak analogies for particular targets. An agent's extra compute, selected examples, and use of them jointly affect outcomes.
- The dataset is English and reflects one project's prompts and quadrant definitions. It does not establish universal cultural understanding, factual truth, or political neutrality.
- Public target labels create potential training contamination; do not claim the benchmark is secret or contamination-free.

Use this release to study crowd prediction, evidence selection, and audience adaptation under declared conditions. Keep original RTR scores, distribution scores, and agent gains clearly separated.

## Files, provenance, and licenses

- `data/*.jsonl`: the 165 derived rows in the three frozen partitions.
- `source/windows.json`: byte-identical original export, including collection metadata.
- `source/split-v1.json`: byte-identical chronological split manifest.
- `release.json`: source repository commit, source hashes, row counts, and SHA-256 checksums for package files.
- `LICENSE`, `LICENSE-CC0`, `LICENSE-MIT`: license scope and full texts.
- `CITATION.cff`: machine-readable citation.

**Data are CC0 1.0 Universal**, matching the existing dedication of `data/windows.json`. Documentation, split metadata, and code excerpts are MIT; benchmark implementation code remains MIT in GitHub. See [LICENSE](LICENSE) for scope. The card's `license: cc0-1.0` metadata describes the data. Citation is appreciated, rather than a condition imposed on CC0 data.

## Citation

```bibtex
@misc{mclaughlin2026rtrbench,
  author = {Noah McLaughlin},
  title = {RTR-bench: Predicting and Learning an Audience's Interpretations},
  year = {2026},
  url = {https://huggingface.co/datasets/noahmclaughlin/RTR-bench},
  note = {Dataset release rtr-bench-hf-v1; report the dataset revision and evaluation protocol used}
}
```
