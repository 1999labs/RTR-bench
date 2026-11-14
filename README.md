# RTR-bench

**RTR-bench** is an exploratory benchmark that tests whether language models can predict how a crowd interprets an ambiguous prompt, and whether examples from that crowd help them improve. It investigates one aspect of cultural fluency: anticipating how people assign meaning to words, people, institutions, and ideas. Its source is [Mixed Messages](https://mixedmessages.fyi), a generative art project where participants respond to a daily prompt by placing a coordinate on a 2×2 grid: Honest vs Performed on one axis, Uniting vs Dividing on the other. The dataset used here contains 39,828 submissions across 165 closed windows.

These submissions were collected through participation in a generative art project. Participants were not trained to apply an annotation rubric or converge on a correct answer. Each placement recorded an interpretation, and together those placements formed a distribution. That distribution preserves both agreement and disagreement: how strongly one reading prevailed, which alternatives attracted people, and where the crowd split.

Commonly cited benchmarks such as [HLE](https://lastexam.ai/) and [SWE-bench](https://www.swebench.com/) evaluate expert answers or software changes against defined criteria for success. RTR-bench evaluates a model against an observed social response. A crowd’s interpretation can be contradictory, unfamiliar, or difficult to anticipate, and accurately predicting it requires distinguishing what a prompt means to that audience from the reading the model would otherwise produce.

For each prompt, the model estimates the share of human submissions in all four quadrants. **Predict** asks for this distribution without historical examples. **Learn** lets the model choose and inspect up to three historical examples before submitting its prediction. Both tracks score the prediction against the recorded crowd distribution, out of 100. Learn also reports its gain or loss against Predict, showing whether gathering evidence improved the answer.

The scores are one way to compare models; their patterns of agreement and error are another. Which interpretations do models consistently anticipate? Where do different models make the same mistake? Which examples do they seek out, and when does that evidence help or mislead them? RTR-bench uses these questions to examine what it means for a model to read the room—with the room here defined by the participants in Mixed Messages.

RTR-bench is intended to surface patterns of agreement, disagreement, and adaptation that warrant further investigation. Its results describe performance on this audience and prompt set; broader claims about cultural fluency require validation across other audiences and settings. Recorded submissions provide an observable prediction target, but do not establish participants’ underlying beliefs or subjective experiences.

## How it works

[Mixed Messages](https://mixedmessages.fyi) publishes one prompt, every day. Over a 24-hour submission period, participants interpret that prompt by placing a coordinate on the grid. When the window closes, a rendering algorithm uses the (x, y) coordinates to create an artwork which depicts the day’s collective interpretation. Each window has a distribution across four quadrants, along with conviction and polarization scores. The 2×2 grid gives us the following readings and coordinates:

| Quadrant | Reading | Coordinates | Color |
|---|---|---|---|
| Honest × Uniting | Bringing us together, authentically | x ≥ 5,000, y < 5,000 | Green |
| Honest × Dividing | Fracturing us, truthfully | x ≥ 5,000, y ≥ 5,000 | Purple |
| Performed × Uniting | Creating false unity among us | x < 5,000, y < 5,000 | Cyan |
| Performed × Dividing | Exploiting our divisions, deliberately | x < 5,000, y ≥ 5,000 | Red |

**The dataset.** 39,828 submissions across 165 of the 174 closed windows, from the November 12, 2026 export. Only windows with at least 25 submissions are included. `data/windows.json` holds everything: the prompt, submission counts by quadrant, center of mass, and conviction and polarization scores. The latter measures are not used in scoring.

The dataset is divided chronologically into 90 reference windows, 30 development windows, and 45 evaluation windows. Every reference window predates every target. Development outcomes are never added to the reference pool. The same data and frozen splits are available on [Hugging Face](https://huggingface.co/datasets/noahmclaughlin/RTR-bench).

**The tasks.** In Predict, the model receives the target prompt, audience description, and quadrant definitions, then returns four probabilities totaling one. A prediction of 0.10, 0.50, 0.25, and 0.15 means it expects 10%, 50%, 25%, and 15% of the crowd’s submissions in the respective quadrants. It sees no historical examples or target outcomes.

In Learn, the model can first request a catalog containing the names and IDs of the 90 reference prompts. It chooses an example to inspect and receives that example’s actual distribution and submission count. It can then choose another example or submit its prediction, up to three distinct inspections. The choices are sequential: evidence from one example can influence what it inspects next.

Each Learn episode starts a fresh conversation. The model receives no target score or correctness feedback during the episode, and it can submit before exhausting its inspection budget. The environment allows eight actions and eight model turns. Learning happens through the conversation; the model’s weights are not updated.

**Scoring.** For each target, sum the squared differences between the predicted and observed shares across all four quadrants. Average those errors equally across the declared targets, then calculate:

```text
Score = 100 × (1 − mean error / 2)
Learn gain = Learn score − Predict score
```

An exact match scores 100. Invalid or missing terminal predictions receive zero and remain in the denominator. Pending targets keep the run incomplete, without an aggregate headline score. Probabilities must be finite values between zero and one; sums within 0.001 of one are normalized.

These scores are not percentage accuracy. Reports include uniform predictions and a constant distribution calculated from the reference windows, so a model’s score can be interpreted against simple baselines. Learn’s final score and its gain should be read together: improvement from a weak starting point does not necessarily produce a strong final prediction.

**Consistency.** Repeated runs record fresh predictions under the same declared settings. Their observed ranges describe variation between runs. Reports also include confidence intervals obtained by resampling target entity groups, preserving matched targets when calculating Learn’s gain. These intervals describe variation across targets; they do not measure repeated-run variability or uncertainty about independent people.

The full comparison includes randomly selected examples and examples selected by a fixed text-similarity method. These are controls for Learn, not additional tracks. Predict supplies the no-example control without duplicate calls. See the [Predict protocol](docs/distribution.md) and [Learn protocol](docs/learn-room.md) for the exact prompts, limits, failure handling, and reproducibility rules.

## Quickstart

You need Node.js 22.18 or newer and an OpenRouter API key with available credits. Use the source checkout for Predict and Learn; the [Development setup](#development) below includes the dataset and required commands.

From the repository directory, add your API key and run a five-target development pilot:

```bash
echo 'OPENROUTER_API_KEY=sk-or-your-key' > .env

node src/cli.ts read-the-room z-ai/glm-5.3-flash \
  --provider Relace \
  --split development \
  --limit 5 \
  --max-usd 0.25
```

Replace `sk-or-your-key` with your OpenRouter API key. To evaluate another model, replace `z-ai/glm-5.3-flash` with its OpenRouter model ID and select a serving provider. Use `read-the-room` for both tracks, `predict` for Predict alone, or `learn` for Learn alone. Add `--controls` to `read-the-room` to include randomly selected and text-similarity examples.

The new commands default to 4,000 output tokens per response; Learn uses the published `transfer-check-v1` policy, up to three inspected examples, and eight model turns. Advanced runs can override `--max-tokens` and, for Learn, `--agent-policy`.

The command prints the scores and Learn’s gain over Predict, and saves requests, responses, action traces, and reports under `results/learn-room/`. The spending limit applies to this run’s API usage and persists across resumes. Provider availability and pricing can change.

To list available model IDs and token prices:

```bash
node src/cli.ts catalog --limit 20
```

Once the settings are fixed, evaluate all 45 final targets with both comparison controls, matching the conditions in the results table:

```bash
node src/cli.ts read-the-room z-ai/glm-5.3-flash \
  --provider Relace \
  --controls \
  --split evaluation \
  --limit 45 \
  --max-usd 0.25
```

Both tracks alone typically use about 270 model calls on 45 targets. A full comparison with `--controls` uses about 360: 45 for Predict, 45 for each automatic control, and approximately five calls per Learn episode. Early stopping can reduce that number; additional agent turns and transport retries can increase it. The first final GLM run used 347 calls.

A development pilot checks the setup and is not comparable with final evaluation results. Identical commands resume their saved runs. Changing the target set or settings creates a separate run and spending ledger; a pilot’s predictions and budget are not automatically carried into a larger run.

## Results

| Model | Provider | Predict | Learn | Learn gain | Full run cost (including controls) |
|---|---|---:|---:|---:|---:|
| z-ai/glm-5.3-flash | Relace (fp4) | 87.93 | 85.57 | −2.37 | $0.03150 |
| z-ai/glm-5.3 | TBD | TBD | TBD | TBD | TBD |
| minimax/minimax-m3.1-flash | TBD | TBD | TBD | TBD | TBD |
| xiaomi/mimo-v2.6-flash | TBD | TBD | TBD | TBD | TBD |
| deepseek/deepseek-v4.1-flash-1017 | TBD | TBD | TBD | TBD | TBD |
| tencent/hy3 | TBD | TBD | TBD | TBD | TBD |
| google/gemini-3.8-flash | TBD | TBD | TBD | TBD | TBD |
| openai/gpt-6-luna | TBD | TBD | TBD | TBD | TBD |
| anthropic/claude-haiku-5.5 | TBD | TBD | TBD | TBD | TBD |
| thinkingmachines/inkling-small | TBD | TBD | TBD | TBD | TBD |
| openai/gpt-oss-120b | TBD | TBD | TBD | TBD | TBD |

## Optional usage

### Run one track

To run Predict alone:

```bash
node src/cli.ts predict z-ai/glm-5.3-flash \
  --provider Relace \
  --split development \
  --limit 5 \
  --max-usd 0.25
```

Replace `predict` with `learn` to run Learn alone. Each reports its own score; Learn’s gain requires the matching Predict result, which `read-the-room` calculates automatically. The standalone commands use the same prompts and scorer as their conditions in the combined run.

Separate commands and changes to `--controls` create separate runs and spending ledgers; saved predictions are not automatically shared between them. Use `read-the-room --controls` from the outset when you want both tracks and the controls.

The legacy `learn-room` and `distribution` commands remain available with their original defaults and saved-run formats. In particular, legacy `learn-room` without `--strategy` runs the no-example and random conditions. New commands use the existing `results/learn-room/` storage and report format; internal strategy labels are `none` (Predict), `agent` (Learn), `random`, and `similar`.

### Synthetic runs

Try Predict on the five-target fixture without an API key or any API spending:

```bash
node src/cli.ts predict \
  --fixture tests/fixtures/learn-room-four-strategies.json \
  --limit 5
```

To exercise Learn and all comparison conditions:

```bash
node src/cli.ts read-the-room \
  --fixture tests/fixtures/learn-room-four-strategies.json \
  --controls \
  --limit 5
```

These commands write explicitly labeled synthetic reports with saved outputs and browsable traces. They demonstrate the pipeline, not model performance.

Synthetic run directories are ignored by Git. Fixture inputs and tests stay tracked; regenerate the reports locally with the commands above. Published benchmark reports remain tracked and are marked as generated in `.gitattributes`.

### Providers and concurrency

OpenRouter may route calls to different providers serving the same model. To list providers, token prices, and numerical precision:

```bash
node src/cli.ts providers z-ai/glm-5.3-flash
```

Use `--provider` to select a provider from that list. A pinned run refuses to fall back to another provider, and reports name the providers that served the calls. Provider availability can change.

Predict and Learn currently execute requests sequentially. Each Learn episode contains a sequence of decisions, with the next request depending on the previous observation. Time and cost depend on the model, provider, token usage, and number of turns.

The current client uses OpenRouter. Direct connections to other hosted or local endpoints are not yet implemented.

## Development

To modify the benchmark or run the repository’s source code, use the setup below. These commands run TypeScript directly and require Node.js 22.18 or newer.

```bash
git clone https://github.com/1999labs/RTR-bench
cd RTR-bench
npm ci
npm test
npm run build

node src/cli.ts read-the-room \
  --fixture tests/fixtures/learn-room-four-strategies.json \
  --controls \
  --limit 5
```

This setup verifies the implementation and generates a synthetic report without making model API calls. For paid runs, add your OpenRouter key and use the Quickstart commands.

Rebuilding the original dataset requires the project’s database connection and the configuration in `scripts/export.mjs`. The exported dataset is already included, so running the benchmark does not require database access. The Hugging Face export and validator preserve the frozen source data and split assignments.

RTR-bench previously evaluated dominant-quadrant predictions. Those scores use a different protocol and are not directly comparable with Predict and Learn. See the [original benchmark README and results](results/history/original-benchmark/README.md).

## License

MIT for the code. CC0 for `data/windows.json` and its derived dataset exports.
