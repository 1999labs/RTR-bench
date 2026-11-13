# Learn the Room protocol v1

Learn the Room is a separate evaluation track built on the [distribution protocol](distribution.md). It uses the same chronological split, probability validation, failure penalties, equal-window weighting, and score out of 100. This implementation provides a controlled interactive environment, no-example and seeded-random baselines, resumable runs, and comparison reports. Similarity selection and model-driven interactive selection are subsequent adapters.

## Environment contract

`createEpisode(target, reference, options)` returns separate `agent` and `evaluator` capabilities. A policy receives only `agent`. The evaluator owns the hidden target distribution, scoring, and trace access. Each episode copies its inputs, has independent state, and rejects references that repeat the target entity, are not earlier than the target, or duplicate an ID.

`agent.observe()` supplies the target ID and prompt, quadrant names, inspection budget, and action limit. `agent.act(action)` accepts these JSON actions:

```json
{"type":"list_examples"}
{"type":"inspect_example","id":1}
{"type":"submit_prediction","prediction":{"performed+uniting":0.2,"honest+uniting":0.3,"performed+dividing":0.4,"honest+dividing":0.1}}
```

| Operation | Observation | Budget behavior |
|---|---|---|
| `list_examples` | Reference IDs and prompt text only | Uses one action |
| `inspect_example` | Selected reference distribution and submission count | Uses one action and, on first successful inspection, one inspection |
| `submit_prediction` | Validation acknowledgement and terminal status | Uses one action and ends the episode |

Default limits are three distinct inspections and eight total actions. The CLI permits inspection budgets from zero to three. Invalid actions, unknown IDs, repeated catalog requests, and denied inspections all consume an action. A duplicate successful inspection returns cached evidence, consumes another action, and does not consume another inspection. An over-budget request reveals no additional evidence.

A valid submit action with invalid probabilities ends the episode with zero points. Reaching the action limit without a prediction also ends it with zero points. A valid prediction on the final allowed action is accepted. A policy may submit before using its inspection budget. Once ended, further actions are rejected without changing the outcome or trace.

Action observations contain validation status and remaining budgets, but never the target distribution, score, reward, or correctness. The host reads `evaluator.outcome()` only for reporting. `evaluator.abort(reason)` records host termination when a prediction cannot be obtained; it is logged separately from policy actions. Every accepted in-episode action attempt and its observation is recorded. Returned values are copies, so changing an observation cannot alter environment state.

This is an API boundary for model evaluation, not a sandbox for arbitrary untrusted local code. A model adapter must receive only the agent-facing observations and must not have filesystem access, the full dataset, evaluator methods, or reports in its context.

## Initial strategies

- **None:** no catalog or examples are supplied to the model. Its prediction messages exactly match direct distribution prediction, and the controller submits the resulting probabilities to the environment.
- **Random:** the controller lists the catalog, selects the configured number of distinct examples without replacement, inspects them through the environment, and supplies only those observations with the prediction instructions. The model makes one final prediction.

The random selector uses SHA-256 of `seed:targetDay` to initialize a 32-bit linear congruential generator, followed by a Fisher–Yates shuffle of sorted reference IDs. The default seed is 7. Selection is independent of execution order, run limits, and other episodes. The algorithm is versioned as `learn-room-strategies-v1`.

These baseline controllers gather evidence automatically. The model does not choose evidence in these two strategies. The interactive environment supports adaptive policies; a model-driven action adapter and similarity selector remain to be implemented and compared under a frozen protocol. Neither baseline uses target outcomes to choose its evidence.

## Scores and comparison

For each completed episode, use the shared `100 * (1 - error / 2)` score. Invalid and missing predictions receive error 2. There is no inspection or compute penalty. Aggregate targets equally, and keep each track's result separate from the original RTR score.

Default runs evaluate both strategies on identical declared targets, reference windows, model/provider, and generation settings. Reports include each strategy's final score, error, validity counts, secondary winning-quadrant accuracy, evidence usage, API attempts, known token/cost totals, and unknown-usage counts.

The paired comparison is:

```text
score_gain = random_score - no_examples_score
error_reduction = no_examples_error - random_error
score_gain = 50 * error_reduction
```

A gain is in points and may be negative. Confidence intervals resample matching target differences by entity group, using 2,000 samples and seed 7. Both final quality and gain are shown. Uniform and constant reference-distribution baselines are also shown. No gain is reported without two complete matching conditions. Incomplete conditions have no headline score.

A fixture comparison demonstrates arithmetic and trace handling; it provides no evidence that random examples improve a real model.

## Runs, retries, and traces

Each baseline episode permits one logical prediction request and at most three HTTP attempts. The shared client retries only transport failures or HTTP 429/500/502/503/504, with one- and two-second backoffs and a 60-second timeout per attempt. Malformed model output is terminal and is not rerolled. Provider pinning disables fallback. Unsupported settings fail explicitly.

Each run manifest fingerprints the dataset, split, target/reference IDs, model/provider, strategies, budget, seed, prompts, environment/scorer/runner versions, generation/retry settings, and fixture contents. Runs live under `results/learn-room/`. Each episode records its exact prediction request, every API attempt, the action/observation trace, and its outcome. Unknown usage from interrupted calls remains explicitly unknown. Fixture mode makes zero API calls.

Identical commands resume saved terminal episodes, including failures. A saved API response is recovered without another call if execution stopped before finalizing its episode. Interrupted attempts consume the fixed attempt budget. Atomic record writes and an exclusive run lock prevent partial writes and concurrent writers. Remove a stale lock only after confirming that its recorded process has exited.

Offline reporting reconstructs evidence access and predictions from the frozen configuration and saved raw responses, verifies the saved request and trace, and recomputes scores rather than trusting cached outcomes. A missing episode file remains pending, with no invented observation trace.

## Commands

Source commands require Node.js 22.18 or newer. The bundled CLI supports the same commands after `npm run build`.

Run the five-target fixture comparison, with no API spending:

```bash
node src/cli.ts learn-room --fixture tests/fixtures/learn-room-pilot.json --limit 5
```

The fixture intentionally contains valid, invalid, and missing predictions. Reports are explicitly labeled synthetic. Both conditions use the same five development targets.

Select a single condition or a different evidence budget and random seed:

```bash
node src/cli.ts learn-room --fixture tests/fixtures/learn-room-pilot.json --strategy random --budget 2 --seed 42 --limit 5
```

For a future authorized model pilot:

```bash
node src/cli.ts learn-room <model-id> --provider <provider-name> --strategy both --split development --limit 5
```

Use `--output <directory>` to choose an output root. Use `--split evaluation` only once development decisions are frozen. Omitting `--limit` runs the entire selected partition and requires corresponding fixture entries in fixture mode.

Regenerate the JSON, Markdown, and searchable HTML reports offline:

```bash
node src/cli.ts learn-room-report <run-directory>
```

Run all tests and build:

```bash
npm test
npm run build
```

## Embedding an interactive policy

In the source checkout, a host can import `createEpisode` from `src/tracks/learn-room/environment.ts`. Construct the episode from the frozen split, then pass only `episode.agent` to a policy. The policy can inspect the catalog, choose references based on previous observations, and submit early. Keep the evaluator and dataset in the host. Persist all policy/model calls alongside `episode.evaluator.trace()`, and use `episode.evaluator.outcome()` for the final score. An external policy still needs its own bounded model-call adapter; the environment bounds actions, while the included baseline runner additionally bounds HTTP attempts.
