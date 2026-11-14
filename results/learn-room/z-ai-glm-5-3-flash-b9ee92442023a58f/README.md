# GLM 5.3 Flash: 4,000-token repeat 2

Replicate `repeat-2`, completed November 13, 2026 (America/New_York), on all 30 development targets with all four strategies. Model: `z-ai/glm-5.3-flash`; provider: Relace (`relace/fp4`). All 120 predictions were valid. There were 238 HTTP attempts, no transport errors, and no length stops.

| Strategy | Score / 100 |
|---|---:|
| No examples | 87.95 |
| Random | 84.14 |
| Similar | 85.12 |
| Agent | 82.73 |

Reported cost: $0.0184686721. Conservative accounting: $0.018468780, below this run's $0.125 cap. No costs remain unknown. The agent used 88 inspections and 148 turns, stopping after two examples on Friends with Benefits and Toxic Positivity.

The only configuration differences from the initial 4,000-token run are the replicate label and spending cap. Initial requests and automatic evidence match. Offline replay passed. Final evaluation targets were not run.

[Three-run analysis](../comparisons/glm-5-3-flash-4000-repeats/README.md) · [Interactive report](report.html) · [Full metrics](report.json)
