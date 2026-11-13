# Learn the Room protocol v2

Learn the Room is a separate evaluation track built on the [distribution protocol](distribution.md). It uses the same chronological split, probability validation, failure penalties, equal-window weighting, and score out of 100. This implementation provides a controlled interactive environment, four evidence strategies, resumable runs, and comparison reports. Strategies are version 2; the runner is version 3 with provider Retry-After handling and optional spending enforcement. The environment and distribution scorer remain version 1. Saved earlier reports remain replayable.

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

## Four strategies

- **None:** no catalog or examples are supplied to the model. Its prediction messages exactly match direct distribution prediction, and the controller submits the resulting probabilities to the environment.
- **Random:** the controller lists the catalog, selects the configured number of distinct examples without replacement, inspects them through the environment, and supplies only those observations with the prediction instructions. The model makes one final prediction.
- **Similar:** the controller ranks reference prompt text by the fixed TF–IDF cosine method below, inspects the highest-ranked examples, and supplies them with the same final prediction instructions as Random.
- **Agent:** the model chooses one environment action per turn, sees the observation, and chooses its next action. It may stop early or submit without inspecting any examples. Each episode starts with a fresh conversation, and only permitted observations enter that conversation.

The random selector uses SHA-256 of `seed:targetDay` to initialize a 32-bit linear congruential generator, followed by a Fisher–Yates shuffle of sorted reference IDs. The default seed is 7. Selection is independent of execution order, run limits, and other episodes. The random algorithm is unchanged from `learn-room-strategies-v1`; the expanded strategy set is versioned as `learn-room-strategies-v2`.

None, Random, and Similar are automatic baseline controllers. Agent selects evidence interactively. None of the selectors receives target outcomes.

### Similarity method: word-char3-tfidf-v1

Normalize prompt text with Unicode NFKC and lowercase it. Tokenize contiguous Unicode letters/numbers. Features are whole tokens plus length-three character sequences from each token padded with `^` and `$`. Word and character features use separate namespaces. For each feature, weight its count with `tf = 1 + ln(count)` and `idf = ln((N + 1) / (document_frequency + 1)) + 1`, where N is the number of reference prompts. Vocabulary and document frequencies are fitted only on reference prompt text. Drop target features outside that vocabulary, L2-normalize the vectors, and rank by cosine similarity. Break equal similarities by ascending reference ID, including all-zero overlap cases.

This is a lexical similarity baseline, not a semantic embedding model. It uses no model service, crowd counts, distributions, or target labels. Keep this limitation visible when interpreting agent gains over it.

### Interactive adapter: learn-room-agent-v1

The adapter uses a plain JSON action protocol over chat completions. Each successful model response is parsed as one action and passed to `agent.act`. Its raw response is added as an assistant message and the environment observation as a user message. Native provider tool-calling support is not required. The initial request contains the target prompt, quadrant definitions, action schema, inspection/action limits, and model-turn limit. The agent must call `list_examples` to see the catalog.

Malformed JSON and empty successful responses become invalid actions and receive feedback; they consume one model turn and one action. This allows bounded recovery on a later turn. A structurally valid submit action with invalid probabilities is terminal, as in every strategy. Transport failures are handled separately and never masquerade as evidence or actions. The model never receives target scores, rewards, or evaluation reports.

The default maximum is eight model turns, independent of the eight-action environment limit. `--max-model-calls` can lower the turn limit to 1–8. Each turn has at most three HTTP attempts, so an agent episode makes at most 24 HTTP attempts under the defaults. Failed and interrupted attempts count toward that bound. Once the model-turn limit is reached without submission, the host ends the episode with zero points. Early successful submission stops immediately.

## Scores and comparison

For each completed episode, use the shared `100 * (1 - error / 2)` score. Invalid and missing predictions receive error 2. There is no inspection or compute penalty. Aggregate targets equally, and keep each track's result separate from the original RTR score.

`--strategy all` evaluates all four strategies on identical declared targets, reference windows, model/provider, and generation settings. For compatibility, the default remains `both` (None and Random). Reports include each strategy's final score, error, validity counts, secondary winning-quadrant accuracy, evidence usage, logical model turns, API attempts, known token/cost totals, and unknown-usage counts. Agent uses the same audience and quadrant definitions, but its action instructions and multi-turn context differ from the one-shot baselines; comparisons do not isolate selection quality from additional inference compute.

The paired comparison is:

```text
score_gain = strategy_score - control_score
error_reduction = control_error - strategy_error
score_gain = 50 * error_reduction
```

A gain is in points and may be negative. Reports compare Random, Similar, and Agent against None, and Agent against Random and Similar. Confidence intervals resample matching target differences by entity group, using 2,000 samples and seed 7. These exploratory intervals are not corrected for multiple comparisons. Both final quality and gain are shown. Uniform and constant reference-distribution baselines are also shown. No gains are reported until the declared conditions are complete. Incomplete conditions have no headline score.

A fixture comparison demonstrates arithmetic and trace handling; it provides no evidence that random examples improve a real model.

## Runs, retries, and traces

Each baseline episode permits one logical prediction request and at most three HTTP attempts. Agent permits the bounded turns described above, with at most three HTTP attempts per turn. The shared client retries only transport failures or HTTP 429/500/502/503/504, with a 60-second timeout per attempt. Backoff is the larger of the provider's Retry-After hint and the default one-/two-second delay. Retry hints can come from HTTP headers or saved OpenRouter error metadata. Malformed baseline predictions are terminal and are not rerolled; malformed agent actions receive bounded feedback instead. Provider pinning disables fallback. Unsupported settings fail explicitly.

Each run manifest fingerprints the dataset, split, target/reference IDs, model/provider, strategies, budget, seed, prompts, environment/scorer/runner versions, generation/retry settings, and fixture contents. Runs live under `results/learn-room/`. Each episode records its exact prediction request, every API attempt, the action/observation trace, and its outcome. Unknown usage from interrupted calls remains explicitly unknown. Fixture mode makes zero API calls.

### Optional spending limit

Use `--max-usd <amount>` with `--provider <name>` to enforce a per-run API usage budget. Before execution, the runner fetches public endpoint metadata, chooses an available fixed-price endpoint for that provider, and records its exact tag, context limit, and token prices in the manifest. Requests pin that tag with fallback disabled and send OpenRouter maximum-price ceilings. Endpoints with unsupported extra charges or cache-read rates above ordinary input rates are rejected by this guard.

Before each HTTP attempt, the runner durably reserves the endpoint's full input-context allowance plus the request's maximum output tokens at those prices. This deliberately overestimates the short text prompts. Reported cost replaces the reservation when available; unknown costs and interrupted requests retain the full reservation. Explicit pre-generation HTTP 429 rate-limit rejections, with no generation ID or choices, release the reservation as unbilled under [OpenRouter's pricing policy](https://openrouter.ai/pricing); that basis is saved in the ledger. This exception never treats network failures or empty successful responses as free. Accounting rounds upward to billionths of a dollar and persists in `spending.json` across resumes. The run stops before dispatch if the next reservation would exceed the cap. An unexpected provider charge above the reservation stops further calls for review.

Budget stops leave the evaluation incomplete and write an incomplete report; they do not convert unattempted targets into benchmark failures. The cap covers this run's API usage, not unrelated account activity or credit-purchase fees. Changing configuration creates a new run with a separate ledger; do not interpret multiple run caps as a shared campaign budget. Fixture runs require no spending policy.

Identical commands resume saved terminal episodes, including failures. Each agent turn stores its exact request, all attempts, and whether its action has been applied. On resume, the adapter reconstructs prior messages and observations, checks request/trace identity, and applies a durably saved but unapplied response exactly once. It does not rerun completed model turns. Interrupted attempts consume the fixed attempt budget. Atomic record writes and an exclusive run lock prevent partial writes and concurrent writers. Remove a stale lock only after confirming that its recorded process has exited.

Offline reporting reconstructs evidence access and predictions from the frozen configuration and saved raw responses, verifies the saved request and trace, and recomputes scores rather than trusting cached outcomes. A missing episode file remains pending, with no invented observation trace.

## Commands

Source commands require Node.js 22.18 or newer. The bundled CLI supports the same commands after `npm run build`.

Run the five-target, four-strategy fixture comparison with no API spending:

```bash
node src/cli.ts learn-room --fixture tests/fixtures/learn-room-four-strategies.json --strategy all --limit 5
```

The fixture intentionally contains valid, invalid, and missing predictions. Agent scripts exercise early stopping, invalid-action recovery, denied over-budget inspections, repeated inspections, and exhausted action budgets. Each baseline strategy maps target day to one raw response string. Agent maps each target day to an array of raw JSON action strings; an exhausted script supplies empty responses until the episode ends. No script is executed as code. Reports are explicitly labeled synthetic. All conditions use the same five development targets; fixture gains are not evidence of real model improvement.

Select a single condition or a different evidence budget and random seed:

```bash
node src/cli.ts learn-room --fixture tests/fixtures/learn-room-pilot.json --strategy random --budget 2 --seed 42 --limit 5
```

For a future authorized model pilot:

```bash
node src/cli.ts learn-room <model-id> --provider <provider-name> --strategy all --split development --limit 5
```

For example, a five-target GLM pilot capped at $0.25:

```bash
node src/cli.ts learn-room z-ai/glm-5.3-flash --provider Tenstorrent --strategy all --split development --limit 5 --max-usd 0.25
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

In the source checkout, a host can import `createEpisode` from `src/tracks/learn-room/environment.ts`. Construct the episode from the frozen split, then pass only `episode.agent` to a policy. The policy can inspect the catalog, choose references based on previous observations, and submit early. Keep the evaluator and dataset in the host. Persist all policy/model calls alongside `episode.evaluator.trace()`, and use `episode.evaluator.outcome()` for the final score. The included adapter in `agent.ts` demonstrates bounded model turns and replay; custom policies must enforce equivalent call limits.
