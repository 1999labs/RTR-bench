# GLM 5.3 Flash development pilot

Completed on November 13, 2026. Five targets (days 100–104), all four strategies, pinned to Relace (`relace/fp4`). All 20 predictions were valid. Each agent episode used three inspections and five model turns.

| Strategy | Score / 100 | Gain vs no examples | Model calls |
|---|---:|---:|---:|
| none | 92.11 | 0.00 | 5 |
| random | 91.19 | -0.92 | 5 |
| similar | 93.00 | 0.89 | 5 |
| agent | 88.89 | -3.22 | 25 |

Uniform baseline: 85.83. Constant reference baseline: 85.68. These are distribution scores, not percentage accuracy.

The completed comparison used 40 HTTP calls. An initial Tenstorrent run stopped after upstream rate limiting: two successful calls and twelve explicit rate-limit rejections. Its records remain separate in ../z-ai-glm-5-3-flash-cad8fe44c6bac007/. Across both runs, reported cost was $0.003279431, within the authorized $0.25. Conservative ledger accounting rounds each cost upward; see pilot.json and spending.json.

The initial run exposed two transport issues that were corrected before the Relace run: respecting Retry-After, and releasing reservations for explicit unbilled pre-generation rate-limit rejections. The old attempts and reconciliation are retained.

The no-examples condition also supplies the direct-distribution evaluation; it uses the same prediction prompt. There was no duplicate standalone paid run.

Similarity-selected examples improved the average by 0.89 points. Random evidence lowered it by 0.92, and agent selection lowered it by 3.22. Every gain interval against no examples spans zero on this five-target pilot. These results verify the workflow and suggest cases to inspect; they do not establish strategy rankings.

A useful case is Minimum Wage: the agent selected Capitalism, Universal Basic Income, and Socialism, yet its score fell from 85.89 without examples to 79.05. Relevant-looking evidence did not guarantee a better audience prediction. The lexical similarity method also selected Socialism and Capitalism for Buddhism, illustrating its surface-text limitation.

[Interactive report](report.html) · [Full metrics](report.json) · [Campaign audit](pilot.json)
