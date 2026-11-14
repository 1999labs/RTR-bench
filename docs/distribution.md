# Distribution prediction protocol v1

This is a separate RTR-bench track. The original winning-quadrant benchmark retains its prompts, scoring, and result paths. [Learn the Room](learn-room.md) reuses this protocol's probability validation and scorer for its interactive environment and initial baseline comparisons.

## Dataset and frozen split

`data/splits/v1.json` pins the exact `data/windows.json` bytes with SHA-256. The loader checks counts, complete coverage, disjoint groups, and chronology before a run or report.

| Partition | Days | Windows | Purpose |
|---|---|---:|---|
| Reference | 1–99, included dataset windows only | 90 | Estimate the constant baseline; future evidence pool |
| Development | 100–129 | 30 | Prompt and implementation development |
| Evaluation | 130–174 | 45 | Final comparison after settings are fixed |

The cutoffs use chronology, not crowd labels. Both Elon Musk windows (days 30 and 99) remain in reference. Prompt grouping trims, lowercases, and collapses whitespace, with an explicit alias map for reviewed same-entity variants. The current alias map is empty after reviewing the prompt list. Related concepts are not collapsed merely because they are thematically similar.

Every reference window predates every target. Development outcomes never enter the reference baseline or later evidence pool. This public dataset has already been used for the original benchmark: these partitions control evidence access and tuning in the new experiment, but do not establish unseen training data. The chronological split may also expose changes in the audience over time.

No separate training partition or RL experiment is defined in v1. A limited pilot selects the first N windows of its declared partition and records those IDs before execution.

## Output and scoring

Return a JSON object containing exactly four numeric probabilities:

```json
{
  "performed+uniting": 0.20,
  "honest+uniting": 0.30,
  "performed+dividing": 0.40,
  "honest+dividing": 0.10
}
```

Values must be finite numbers in [0, 1]. No string coercion, prose, code fences, extra keys, or percentage values are accepted. A sum within 0.001 of one, inclusive, is normalized to one; the original sum and raw response are retained. Larger deviations fail validation.

For each target, derive the observed shares from integer quadrant counts divided by submissions. Sum the four squared differences between predicted and observed shares. Average errors equally across the declared targets, then report `100 * (1 - mean_error / 2)`. A score of 100 is an exact match; 0 is the global worst case. This is not percentage accuracy, and 50 is not a chance baseline.

Final invalid, missing, or API-failed predictions receive penalty 2 (zero points) and stay in the denominator. The report distinguishes an assigned failure penalty from a measured distribution error. Pending targets make a run incomplete; an incomplete run has no aggregate headline score. Reports separately show valid-response error, invalid-output rate, overall failure rate, and valid/invalid/missing/pending counts.

Secondary winning-quadrant accuracy accepts every crowd co-winner. When a prediction has K exactly tied maxima, its credit is the fraction of those K quadrants that are crowd co-winners. This is the expected accuracy of a uniform tie-break, without introducing randomness. A uniform prediction against one crowd winner earns 0.25 credit.

Always report both baselines on the exact same targets:

- Uniform: 0.25 per quadrant.
- Constant reference: the arithmetic mean of the 90 reference-window distributions. Each reference window has equal weight, irrespective of submission count.

Report gains over baselines in score points. Confidence intervals use 2,000 bootstrap samples of entity groups with seed 7. Paired gains resample matching target differences together. These intervals describe variation across targets, not uncertainty about independent people in this self-selected audience. Five-target pilots are setup checks, not model rankings.

## Calls, failures, and reproducibility

The v1 prompt is frozen in `src/tracks/distribution/prompt.ts`. Only the target word, audience description, quadrant definitions, and output instructions enter the API messages. The runner sends neither reference labels nor target labels for direct distribution prediction.

API runs use temperature 0, a 2,000-token output cap, and one prediction per window. There are no option rotations or automatic prompt-repair attempts. A requested provider is pinned with fallback disabled. Unpinned runs record actual serving providers. Unsupported settings fail explicitly rather than silently changing the request.

Each target has at most three attempts. Only transport failures and HTTP 429/500/502/503/504 are retried, with 1- and 2-second backoffs and a 60-second timeout per attempt. Successful API responses with malformed or absent model content are terminal failures. An interrupted attempt consumes an attempt slot, since its API outcome and charge may be unknown.

Each request and every attempt are saved, including raw responses, errors, provider, timestamps, and available usage. Reports sum known cost and tokens over all attempts and count attempts with unknown cost or tokens separately. Fixture runs make zero API calls and are visibly labeled synthetic.

A deterministic run ID hashes dataset and split fingerprints, target/reference IDs, model and requested provider, prompt and scorer versions, generation/retry settings, and fixture contents when applicable. Identical commands resume terminal records, including failures, without rerolling them. Changing a target set or configuration produces a separate run. Increment protocol/runner versions when changing behavior.

Writes use a temporary file and rename. An exclusive `run.lock` prevents simultaneous writers. After an unclean process exit, first confirm the recorded PID is no longer running, then remove that run's stale lock before resuming. Saved API responses can be recovered without another call. These controls reproduce configuration and scoring, not necessarily identical outputs from nondeterministic model services.

## Commands

Source commands require Node.js 22.18 or newer. The bundled CLI can also run these commands after `npm run build`.

Run the five-target, zero-cost fixture pilot:

```bash
node src/cli.ts distribution --fixture tests/fixtures/distribution-pilot.json --limit 5
```

The fixture intentionally includes three valid outputs, one invalid sum, and one empty response. It is a pipeline demonstration, not a model result.

For a future paid API pilot, after selecting a model/provider:

```bash
node src/cli.ts distribution <model-id> --split development --limit 5 --provider <provider-name>
```

Omit `--limit` to cover the full partition. Use `--split evaluation` only after development decisions are frozen. `--output <directory>` changes the output root, which defaults to `results/distribution/`. Each run directory contains `manifest.json`, per-target `records/`, and JSON/Markdown/HTML reports. The HTML report supports prompt filtering and inspection of every request and attempt.

Regenerate a report without network access:

```bash
node src/cli.ts distribution-report <run-directory>
```

Verify locally without API spending:

```bash
npm test
npm run build
```

## Evaluation status

Both tracks have completed development validation and a [first final evaluation](../results/learn-room/z-ai-glm-5-3-flash-e9d0327447ef1856/README.md) on all 45 frozen evaluation targets. GLM 5.3 Flash through Relace scored **87.93/100** for direct distribution prediction, using the identical no-example condition in Learn the Room without duplicate calls. All 45 direct predictions were valid. Uniform and constant reference-distribution baselines scored 85.39 and 85.56, respectively; these scores are not percentage accuracy.

The same run evaluated all three evidence conditions, for 180 valid predictions total. The transfer-check agent scored 85.57; see the linked report for paired comparisons, uncertainty, usage, and the frozen protocol. The original RTR score remains separate. Future models should use the same declared settings; any policy development informed by these final outcomes must disclose that this holdout has been used.
