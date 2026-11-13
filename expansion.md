# RTR-bench expansion: distribution prediction and Learn the Room

This document describes two additions to RTR-bench using the existing Mixed Messages dataset, without recruiting participants or collecting new human responses. The distribution-prediction track has a versioned split, shared scorer, CLI runner, and reports. Learn the Room has a controlled interactive environment, no-example/random/similarity/agent strategies, and comparison reports with episode traces. Both are verified with synthetic fixtures; no live model pilots have been run. See the [distribution protocol](docs/distribution.md) and [Learn the Room protocol](docs/learn-room.md) for implemented rules and commands.

Both additions belong in the existing repository. They share a distribution-prediction format and scorer, while testing different abilities:

- **Distribution prediction:** Can a model anticipate the full spread of this audience's interpretations?
- **Learn the Room:** Can an agent improve that prediction by choosing useful historical evidence about the audience?

The existing winning-quadrant benchmark remains a separate track. Its scoring rules, saved responses, and published results do not change.

## Three separate scores

RTR-bench is a suite of three evaluation tracks. Each reports a score out of 100, with higher scores indicating better performance. There is no combined headline score or weighted average across tracks.

| Track | Primary score | Meaning |
|---|---|---|
| Existing RTR | Winning-quadrant accuracy × 100 | Percentage of evaluated prompts with a correct crowd-winning prediction |
| Distribution prediction | `100 × (1 - mean_error / 2)` | Closeness to the full recorded crowd distributions |
| Learn the Room | `100 × (1 - mean_error / 2)`, at a fixed evidence budget | Closeness to the full recorded crowd distributions after gathering evidence |

The two new scores share a scorer, but remain separate results with their own evaluation conditions. Their 0–100 scale is a linear transformation of distribution error, not percentage accuracy. A score of 90 means mean error of 0.20; it does not mean 90% of predictions were correct. Scores across the three tracks should not be treated as interchangeable.

## 1. Distribution prediction

### The task

Give a model a prompt and the definitions of the four quadrants. Ask it to estimate the percentage of human submissions in each quadrant, rather than selecting only a winning quadrant.

For example, a model might return:

| Quadrant | Predicted share |
|---|---:|
| Honest × Uniting | 15% |
| Honest × Dividing | 55% |
| Performed × Uniting | 10% |
| Performed × Dividing | 20% |

These numbers are illustrative. Predictions must contain four valid probabilities that sum to one, with a documented tolerance for rounding. Invalid or missing outputs must be recorded and handled consistently rather than silently dropped.

The target distribution comes directly from each window's recorded quadrant counts divided by its submission count. The model does not receive those counts before answering.

### What it measures

Two models can choose the same winning quadrant while making very different predictions about the rest of the audience. This track makes those differences measurable. It can reveal whether models anticipate strong consensus, closely divided responses, and support for interpretations that do not win.

Use a quadratic distribution error for each window:

```text
error = sum over the four quadrants of (predicted_share - recorded_share)^2
mean_error = sum of window errors / number of evaluation windows
score = 100 * (1 - mean_error / 2)
```

For valid probability distributions, error ranges from zero to two. Zero is an exact match to the recorded distribution; two is the global worst case, with all predicted and observed mass in different quadrants. Average equally across evaluation windows before converting to the headline score out of 100. The transformation preserves the ranking given by mean error. Also publish mean error so readers can inspect the underlying metric.

The global worst case is not attainable against every recorded distribution. Diffuse targets can produce fairly high scores even for simple predictions, so every report must show baseline scores alongside model scores. Do not interpret 50 as chance performance.

Include two baselines:

- **Uniform:** predict 0.25 for every quadrant.
- **Constant reference distribution:** take the arithmetic mean of the reference windows' four-quadrant distributions and use that prediction for every target. Estimate it only from the designated reference data. Average windows equally, matching the primary metric; do not pool their submission counts.

Report winning-quadrant accuracy, invalid-output rate, and uncertainty across evaluated targets as secondary measures. Define the rule for tied predicted maxima before evaluation, and accept any recorded crowd co-winner. Any submission-weighted analysis should be labeled separately so that heavily submitted windows do not silently dominate the main score.

### Invalid and missing predictions

Freeze validation, rounding tolerance, and retry limits before comparing models. A final missing or invalid prediction receives a **failure penalty of 2**, equivalent to zero points for that window. This is an assigned penalty, not a measured distribution error. Retain these windows in the headline denominator and record their failure reasons.

Declare the target set in the run manifest before execution. A completed evaluation must account for every declared target, including failures; interrupted runs remain explicitly incomplete. A limited pilot declares its smaller target set and is not comparable to a full evaluation.

Publish valid-response mean error separately for diagnosis, together with valid, invalid, missing, and total target counts. Never silently drop failures or use valid-only performance as the headline score. Record retry attempts and their available token usage and cost.

New model calls are required. The four existing option-order responses measure variation across calls; their vote shares are not the model's estimate of the human response distribution.

### Is this an RL environment or a benchmark?

Initially, this is an **evaluation task**. Fixing the prompt set, model instructions, output format, and scoring procedure makes it a **benchmark track**.

Its scorer could also supply rewards during post-training. Running the evaluation alone does not train a model, and the initial implementation does not require an RL training loop.

## 2. Learn the Room

### The task

Turn crowd prediction into an interactive evidence-gathering task. The agent receives a target prompt and can inspect a limited number of historical examples before predicting the target's distribution.

A minimal episode:

1. Show the target prompt and quadrant definitions.
2. Make a catalog of reference prompt names available, without their crowd results.
3. Let the agent choose an example to inspect.
4. Return that example's recorded quadrant distribution and submission count.
5. Allow additional inspections up to a fixed budget, initially three distinct examples.
6. Accept a final four-quadrant prediction and score it against the hidden target distribution.

The target window's recorded answer is never available through the agent's tools. The agent can stop before using its full inspection budget.

### The environment

A small environment can expose three operations:

- `list_examples`: return the available reference prompts and identifiers.
- `inspect_example`: reveal one permitted example's recorded distribution and submission count, consuming an inspection.
- `submit_prediction`: validate the final probability distribution and end the episode.

The environment controls the reference catalog, hidden target, remaining budget, action validation, and scoring. Log every action and observation so that a reader can reconstruct what evidence the agent received.

The first version should give the agent access through this controlled interface. It should not expose the local dataset, target labels, or unrestricted retrieval that bypasses the experiment.

### What it measures

The question becomes: **Given limited evidence about an audience, how effectively can an agent learn to predict it?**

An agent might inspect a thematically related prompt, seek evidence about an audience's response to institutions, or stop once further evidence seems unlikely to help. Its selected examples and final predictions make those choices inspectable.

Compare four strategies on the same targets and reference pool:

| Strategy | Evidence available |
|---|---|
| No examples | Prompt and quadrant definitions only |
| Random examples | A fixed number of randomly selected reference examples |
| Similar examples | The same number selected by a documented text-similarity method |
| Agent-selected examples | Up to the same number, selected interactively |

Use fixed random seeds and record the similarity method and version. Evidence budgets should be explicit; additional reasoning and tool calls can still make strategies differ in compute cost.

### Scoring and the value of evidence

Use the same probability validation, distribution error, 0–100 conversion, and failure policy as the distribution-prediction track. The primary result is the final prediction score at a fixed inspection budget, initially up to three distinct reference examples. Bound total actions and model calls as well as distinct inspections, so repeated invalid actions cannot run indefinitely.

Compare all four strategies using the same target set, reference pool, model/provider, and comparable prediction instructions and generation settings. Keep episodes independent: target labels and scores must not become evidence or memory for later episodes.

Alongside each strategy's final score, report improvement over that model's no-examples condition:

```text
error_reduction = mean_error_without_examples - mean_error_with_examples
score_gain = score_with_examples - score_without_examples
           = 50 * error_reduction
```

Positive values mean evidence helped. Score gain is reported in points and can be negative; it is not another score out of 100. Use the same failure penalties in both conditions. Show both final score and gain: gain alone can flatter a model with a weak starting point, while final score alone does not establish whether gathering evidence helped. Compare agent-selected evidence against random and similarity-selected evidence as well as no examples.

Report uncertainty in paired differences on the same targets, keeping repeated-entity groups together when resampling. Include winning-quadrant accuracy, invalid-output rate, inspection count, model calls, tokens, and API cost where available. Keep evidence usage and compute cost separate from prediction quality; the initial benchmark score has no inspection or cost penalty.

Reuse direct distribution-prediction results for the no-examples condition only when the target set, prompt, model/provider, generation settings, and scoring protocol match. Otherwise, run a matching control.

### Is this an RL environment or a benchmark?

Learn the Room is an **interactive environment**: an agent takes actions, receives observations, and gets a scored outcome.

Running an ordinary model in it is an **agent evaluation**. A fixed collection of episodes and comparison rules forms a **benchmark track**. Using the environment's rewards to update a model's weights would make it an **RL training setup**.

Initially, report prediction quality and evidence usage separately. For a later training experiment, one possible reward is `1 - error / 2 - lambda * inspections`, where error is the quadratic distribution error defined above. The inspection penalty and all other reward choices must be fixed before comparing trained policies. Rewarding accurate prediction of this audience does not establish broader cultural fluency.

Building the environment is a separate milestone from demonstrating successful RL training. Training would require additional integration, compute, and evidence of improvement on held-out targets.

## Shared data and evaluation design

Use a versioned, reproducible split between reference examples and evaluation targets. Repeated prompts or entities should stay in the same group when splitting, so that an agent cannot retrieve another window for the same entity as a shortcut. Document grouping decisions and the resulting split sizes.

Use development targets to choose instructions, budgets, and reward settings. Keep final evaluation targets separate from those decisions. If policies are trained later, reserve a separate training split and withhold final evaluation outcomes from training and memory updates.

The dataset currently contains 165 windows and 39,828 submissions. These are 165 prompt windows, not 39,828 independent tasks or necessarily that many unique people. Recorded distributions are finite samples from a self-selected art-project audience. Report submission counts and uncertainty alongside results.

Because the existing dataset is public, a held-out split does not guarantee that a model has never encountered its answers. Describe initial findings as exploratory. Future MM windows could support prospective evaluation if predictions are locked before the outcomes are available.

## Repository and implementation plan

Build both tracks in the existing RTR-bench repository, with separate modules, commands, and result directories. Reuse model access, dataset loading, response logging, and reporting where practical. Keep task-specific instructions and scoring separate from the current benchmark.

Both track commands are implemented:

```bash
rtr-bench distribution <model>
rtr-bench learn-room <model>
```

Each result should identify its track, dataset version, split, model and provider, instructions, and relevant settings. New result directories should not overwrite existing benchmark outputs.

Implement in this order:

1. Define the versioned data split and output schema.
2. Build probability validation, distribution scoring, and the constant-distribution baseline.
3. Add the direct distribution-prediction runner and report.
4. Build the interactive environment and random-example baseline.
5. Add similarity-selected and agent-selected evidence strategies.
6. Produce a comparison report with browsable episode traces.

The initial version can run locally through the CLI and existing model APIs, with an HTML report for inspecting results. No new human participation is required. RL training integration can follow after the environment and evaluation procedures work reliably.

A separate repository would become useful if the environment develops into a general toolkit for multiple datasets. For the first implementation, keeping both tracks inside RTR-bench makes their shared data, scoring, and relationship to the original benchmark clear.
