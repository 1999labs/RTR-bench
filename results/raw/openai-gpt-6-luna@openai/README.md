# openai/gpt-6-luna

Provider pin: **OpenAI**. This is the run used in the main README comparison.

- `predict/`: 660 responses to “Which reading did most people choose?”
- `read/`: 660 responses to “Which reading is yours?”
- Coverage: 165 prompts × four option orders × two questions = 1,320 saved call records.
- Saved records with an error: 0; records without a parsed answer: 0. Failed or invalid calls are preserved as part of the run record.

Filenames use `<day>-<order>.json`; for example, `24-1.json` is window 24 with option ordering 1. Prompt text and crowd submissions are in [`data/windows.json`](../../../data/windows.json). See the [results guide](../../README.md) for scoring and aggregation details.
