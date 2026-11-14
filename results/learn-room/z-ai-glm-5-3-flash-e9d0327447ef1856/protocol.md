# First final evaluation: frozen protocol

The next-step proposal was recorded before execution in commit `94a00df3`, in [the development comparison](../comparisons/glm-5-3-flash-policy-repeats/README.md). The user authorized that proposal with “Go.” The run began at the timestamp recorded in [manifest.json](manifest.json). This note records the settings while the run is in progress; it does not use final outcomes to choose settings.

- Model: `z-ai/glm-5.3-flash`; provider: Relace, pinned `relace/fp4`, no fallback.
- Candidate agent policy: `transfer-check-v1`, selected after development evaluation. The original CLI default remains unchanged.
- Targets: all 45 frozen evaluation windows, days 130–174, used for the first time in these new tracks. These data are already public; this is a development holdout, not a guarantee against model pretraining exposure.
- References: the original 90 frozen reference windows. No development or evaluation outcomes are added to the agent's reference catalog.
- Conditions: none, random, similar, agent. None uses the direct distribution prediction messages and scorer and supplies that track's result without duplicate requests.
- Generation: temperature 0, 4,000 maximum output tokens, random-selection seed 7.
- Agent limits: three distinct inspections, eight environment actions, eight logical model turns. Early submission is allowed.
- Transport policy: up to three attempts per turn, 60-second timeout, existing Retry-After behavior. No rerolls for low scores or invalid final outputs.
- Score: shared `distribution-v1`, each condition separately out of 100, equal target weighting. Invalid/missing terminal predictions receive zero; pending predictions keep the run incomplete. Original RTR scores are separate.
- Report all four scores, uniform/constant-reference baselines, validity, paired gains, exploratory target-group bootstrap intervals, inspection/turn usage, and all reported/unknown costs. Intervals do not measure variation across repeated model runs.
- Fresh authorization: $0.25 maximum for this one run. Preflight public metadata confirmed 1,048,576 context tokens, $0.0000000399/input token, and $0.0000000784/output token. The durable spending ledger conservatively reserves full context plus maximum output before each attempt; unknown costs keep their reservation. Stop if another reservation would exceed the cap. Do not reset the ledger or raise the cap.
- Do not change prompts/settings after inspecting final outcomes. Any later development using these outcomes must disclose exposure to this holdout; a fresh holdout is needed for a new independent final test.

Command executed:

```bash
node src/cli.ts learn-room z-ai/glm-5.3-flash --provider Relace --strategy all --split evaluation --limit 45 --max-tokens 4000 --agent-policy transfer-check-v1 --max-usd 0.25
```

Runtime source: commit `94a00df3`. Full config, hashes, target/reference IDs, and pinned prices are preserved in the manifest.
