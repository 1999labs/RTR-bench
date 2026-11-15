# RTR-bench

**RTR-bench** is an exploratory benchmark that tests whether language models can predict how a crowd interprets an ambiguous prompt, and whether examples from that crowd help them improve. It investigates one aspect of cultural fluency: anticipating how people assign meaning to words, people, institutions, and ideas. Its source is [Mixed Messages](https://mixedmessages.fyi), a generative art project where participants respond to a daily prompt by placing a coordinate on a 2×2 grid: Honest vs Performed on one axis, Uniting vs Dividing on the other. The dataset used here contains 39,828 submissions across 165 closed windows.

These submissions were collected through participation in a generative art project. Participants were not trained to apply an annotation rubric or converge on a correct answer. Each placement recorded an interpretation, and together those placements formed a distribution. That distribution preserves both agreement and disagreement: how strongly one reading prevailed, which alternatives attracted people, and where the crowd split.

Commonly cited benchmarks such as [HLE](https://lastexam.ai/) and [SWE-bench](https://www.swebench.com/) evaluate expert answers or software changes against defined criteria for success. RTR-bench evaluates a model against an observed social response. A crowd’s interpretation can be contradictory, unfamiliar, or difficult to anticipate, and accurately predicting it requires distinguishing what a prompt means to that audience from the reading the model would otherwise produce.

For each prompt, the model estimates the share of human submissions in all four quadrants. **`Predict`** asks for this distribution without historical examples. **`Learn`** lets the model choose and inspect up to three historical examples before submitting its prediction. Both tracks score the prediction against the recorded crowd distribution, out of 100. Learn also reports its gain or loss against Predict, showing whether gathering evidence improved the answer.

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

**The tasks.** In **`Predict`**, the model receives the target prompt, audience description, and quadrant definitions, then returns four probabilities totaling one. A prediction of 0.10, 0.50, 0.25, and 0.15 means it expects 10%, 50%, 25%, and 15% of the crowd’s submissions in the respective quadrants. It sees no historical examples or target outcomes. In **`Learn`**, the model can first request a catalog containing the names and IDs of the 90 reference prompts. It chooses an example to inspect and receives that example’s actual distribution and submission count. It can then choose another example or submit its prediction, up to three distinct inspections. The choices are sequential: evidence from one example can influence what it inspects next.

Note that each **`Learn`** episode starts a fresh conversation. The model receives no target score or correctness feedback during the episode, and it can submit before exhausting its inspection budget. The environment allows eight actions and eight model turns. Learning happens through the conversation; the model’s weights are not updated.

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

Run RTR-bench from Terminal using one of these three commands:

| Command | What it runs |
|---|---|
| `npx rtr-bench read-the-room <model>` | **Predict and Learn**, plus Learn's gain or loss against Predict |
| `npx rtr-bench predict <model>` | **Predict only**: predict the crowd's distribution without examples |
| `npx rtr-bench learn <model>` | **Learn only**: inspect historical examples, then predict; does not calculate Learn gain |

`<model>` is a placeholder for the model's OpenRouter ID. Each command also needs the provider and run settings. **After the one-time setup below**, this complete example runs both tracks on **five development prompts**, with a **$0.25 spending cap**:

```bash
npx rtr-bench read-the-room z-ai/glm-5.3-flash \
  --provider Relace \
  --split development \
  --limit 5 \
  --max-usd 0.25
```

To run only one track, replace `read-the-room` with `predict` or `learn` and keep the rest of the command. `--limit 5` means five target prompts per selected track. The backslashes let one command continue across several lines; copy the whole block into Terminal.

### Before your first run

1. Install [Node.js](https://nodejs.org/) **22.18 or newer**, which includes `npx`. `npx` downloads and starts RTR-bench for you. You do not need to clone GitHub or run `npm install` or `npm ci` for this path. The dataset is included; no GPU or database setup is needed.
2. Open Terminal in a folder where you want to keep your results. Any folder you choose is fine. Creating a new folder is optional and does not start an evaluation.
3. Get an [OpenRouter API key](https://openrouter.ai/settings/keys) and add credits to that account. In your chosen folder, create a plain-text file named `.env` containing the line below, replacing `sk-or-your-key` with your key. Keep this file private.

```text
OPENROUTER_API_KEY=sk-or-your-key
```

Keep Terminal in that same folder and run the complete command above. The benchmark reads `.env`, sends requests through OpenRouter, and charges your OpenRouter account for model usage. `--max-usd` is a spending limit, not a fixed price; the run stops incomplete if it cannot continue within that limit.

These commands require RTR-bench **0.2.0 or newer** on npm. To select that exact release, replace `npx rtr-bench` with `npx rtr-bench@0.2.0`. GitHub updates and npm releases are published separately.

### Read the results

When the run finishes, Terminal prints each selected track's score and the path to `report.html`. Open that file in a browser to inspect the results. A combined `read-the-room` run also prints Learn's gain or loss against Predict.

The benchmark automatically creates `results/learn-room/` inside your current folder and saves reports, requests, responses, action traces, and spending records there. You do not need to create the results folders yourself.

Running the identical command again resumes its saved run rather than starting a fresh evaluation. Changing the model, selected tracks, target set, or settings creates a separate run and spending ledger. A small development run's predictions and budget are not carried into a larger run.

### Run the final evaluation

Use development prompts to check the setup. Once the settings are fixed, the following command runs **Predict, Learn, and both comparison controls on all 45 final evaluation prompts**, matching the conditions in the results table:

```bash
npx rtr-bench read-the-room z-ai/glm-5.3-flash \
  --provider Relace \
  --controls \
  --split evaluation \
  --limit 45 \
  --max-usd 0.25
```

`--controls` adds two comparisons: one supplies randomly selected historical examples, and the other supplies examples selected by text similarity. Without this flag, `read-the-room` runs only Predict and Learn. A development run is not comparable with the final evaluation results.

To evaluate another model, replace `z-ai/glm-5.3-flash` with its OpenRouter model ID and select a provider that serves it. You can list models and inspect a model's providers with:

```bash
npx rtr-bench catalog --limit 20
npx rtr-bench providers z-ai/glm-5.3-flash
```

Provider availability and pricing can change. Choose a spending cap appropriate for the selected model and provider; $0.25 is the cap for the GLM example, not a recommended budget for every model.

### Use the GitHub source instead (optional)

If you want to inspect or change the code, install [Git](https://git-scm.com/) and run:

```bash
git clone https://github.com/1999labs/RTR-bench
cd RTR-bench
npm ci
```

These commands download the project, enter its folder, and install its supporting software. If you already have a checkout, use that folder. Create `.env` there as described above, then replace `npx rtr-bench` with `node src/cli.ts` in the evaluation commands. `src/cli.ts` is the source file that starts the benchmark. This is an alternative to the npm path, not an additional setup step.

## Results

| Model | Provider | Predict | Predict Cost | Learn | Learn Gain | Learn Cost | Total Cost |
|---|---|---:|---:|---:|---:|---:|---:|
| glm-5.3-flash | Relace (fp4) | 87.93 | $0.00241 | 85.57 | −2.37 | $0.02039 | $0.03150 |
| glm-5.3 | Wafer (fp4) | 86.04 | $0.00551 | 82.87 | −3.17 | $0.03842 | $0.05741 |
| minimax-m3.1-flash | Inferact vLLM (nvfp4) | 86.95 | $0.01748 | 84.24 | −2.71 | $0.06345 | $0.11698 |
| mimo-v2.6-flash | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| deepseek-v4.1-flash-1017 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| hy3 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| gemini-3.8-flash | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| gpt-6-luna | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| claude-haiku-5.5 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| inkling-small | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| gpt-oss-120b | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Optional usage

The examples below use the GitHub source checkout. For model evaluations through the npm package, replace `node src/cli.ts` with `npx rtr-bench`. The synthetic examples use fixture paths from the source checkout.

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

On 45 targets, Predict and Learn together typically use about 270 model calls. Adding `--controls` brings that to about 360: 45 for Predict, 45 for each automatic control, and approximately five calls per Learn episode. Early stopping can reduce that number; additional agent turns and transport retries can increase it. The first final GLM run used 347 calls.

In version 0.2.1, the public commands default to 8,000 output tokens per response. Learn uses the published `transfer-check-v1` policy, up to three inspected examples, and eight model turns. Advanced runs can override `--max-tokens` and, for Learn, `--agent-policy`.

To resume a run created with the earlier 4,000-token default, repeat its original command with `--max-tokens 4000` explicitly. Changing the allowance creates a separate run. The [final evaluation plan](docs/final-run-plan-8000.md) declares 8,000 tokens for all eleven models, including a new GLM result under that same setting. Until that rerun is complete, the `glm-5.3-flash` row retains its earlier 4,000-token result; the new final runs use 8,000. Total Cost includes both controls.

The current client uses OpenRouter. Direct connections to other hosted or local endpoints are not yet implemented.

## Development

After the GitHub source setup in [Quickstart](#quickstart), use these commands from the project folder to check changes and build the distributable program. Source commands run TypeScript directly and require Node.js 22.18 or newer.

```bash
npm test
npm run build

node src/cli.ts read-the-room \
  --fixture tests/fixtures/learn-room-four-strategies.json \
  --controls \
  --limit 5
```

`npm test` checks the implementation. `npm run build` bundles the source into `dist/cli.js`, the program included in the npm package. The fixture command generates a synthetic report without making model API calls. For paid runs, use the Quickstart commands. See the [npm release instructions](docs/npm-release.md) for packaging and publishing.

Rebuilding the original dataset requires the project’s database connection and the configuration in `scripts/export.mjs`. The exported dataset is already included, so running the benchmark does not require database access. The Hugging Face export and validator preserve the frozen source data and split assignments.

RTR-bench previously evaluated dominant-quadrant predictions. Those scores use a different protocol and are not directly comparable with Predict and Learn. See the [original benchmark README and results](results/history/original-benchmark/README.md).

## License

MIT for the code. CC0 for `data/windows.json` and its derived dataset exports.
