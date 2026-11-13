# RTR-bench expansion: distribution prediction and Learn the Room

This document proposes two additions to RTR-bench that can be built using the existing Mixed Messages dataset, without recruiting participants or collecting new human responses. Neither track is implemented yet.

Both additions belong in the existing repository. They share a distribution-prediction format and scorer, while testing different abilities:

- **Distribution prediction:** Can a model anticipate the full spread of this audience's interpretations?
- **Learn the Room:** Can an agent improve that prediction by choosing useful historical evidence about the audience?

The existing winning-quadrant benchmark remains a separate track. Its scoring rules, saved responses, and published results do not change.

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

Use a quadratic distribution error: the sum of the squared differences between the four predicted shares and recorded shares. Lower is better; zero means an exact match to the recorded distribution. Average this error equally across evaluated windows as the primary metric, and report winning-quadrant accuracy as a secondary metric.

Include a baseline that predicts the same distribution for every target, estimated only from the designated reference data. Any submission-weighted analysis should be labeled separately so that heavily submitted windows do not silently dominate the main score.

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

Use fixed random seeds and record the similarity method and version. Report distribution error, winning-quadrant accuracy, inspection count, model calls, tokens, and API cost where available. Evidence budgets should be explicit; additional reasoning and tool calls can still make strategies differ in compute cost.

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

The following command names are proposals, not existing functionality:

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
