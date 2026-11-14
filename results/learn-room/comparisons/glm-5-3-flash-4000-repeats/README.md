# GLM 5.3 Flash: three-run development repeatability

Completed November 13, 2026 (America/New_York). This comparison uses three fresh runs of `z-ai/glm-5.3-flash` on Relace (`relace/fp4`), each covering the same 30 development targets under all four strategies with a 4,000-token output allowance. The 2,000-token experiment is excluded. The 45 final evaluation targets remain untouched.

The agent's average score was lower than no examples in all three runs. The observed variation does not explain away that pattern within this setup. Similarity-selected evidence ranged from essentially tied with no examples to 2.83 points worse; there is no consistent average benefit from evidence here.

| Strategy | Initial run | Repeat 2 | Repeat 3 | Mean / 100 | Observed range | Sample SD |
|---|---:|---:|---:|---:|---|---:|
| No examples / direct distribution | 87.03 | 87.95 | 87.91 | **87.63** | 87.03–87.95 | 0.52 |
| Random examples | 83.88 | 84.14 | 86.21 | **84.74** | 83.88–86.21 | 1.28 |
| Similar examples | 87.04 | 85.12 | 86.83 | **86.33** | 85.12–87.04 | 1.05 |
| Agent-selected examples | 83.72 | 82.73 | 84.53 | **83.66** | 82.73–84.53 | 0.90 |

Scores measure distribution error, not percentage accuracy. Uniform scores 81.61 and the constant reference baseline scores 81.25 on this target set.

Paired gains use each condition's matching no-example score within that run:

| Strategy | Initial gain | Repeat 2 gain | Repeat 3 gain | Mean gain |
|---|---:|---:|---:|---:|
| Random | -3.15 | -3.81 | -1.70 | **-2.89** |
| Similar | +0.01 | -2.83 | -1.08 | **-1.30** |
| Agent | -3.31 | -5.22 | -3.38 | **-3.97** |

These ranges and sample standard deviations describe three observed runs; they are not confidence intervals or estimates of broad model variability. All runs reuse the same 30 targets, so there are not 90 independent targets. Single-run target-bootstrap intervals remain available in each report. This analysis does not pool repeated predictions as independent observations or establish that the pattern generalizes to other models, providers, or audiences.

## Where the pattern is consistent

Agent evidence improved five targets in all three runs and worsened sixteen in all three; nine had mixed directions. Examples of consistent effects, relative to each run's no-example prediction:

| Target | Mean agent gain | Range across runs |
|---|---:|---|
| Friends with Benefits | +11.60 | +10.68 to +12.35 |
| Drake | +11.18 | +5.10 to +15.83 |
| TikTok | +8.83 | +7.77 to +9.98 |
| Kim Jong-un | -23.90 | -30.06 to -14.35 |
| Rainbows | -16.62 | -19.28 to -15.17 |
| Defense Contractors | -13.72 | -21.30 to -7.72 |
| Tom Brady | -11.81 | -13.56 to -9.37 |

These examples were selected after observing the results and are diagnostic cases, not independent confirmations. The next useful work is an offline review of the consistently helpful and harmful evidence traces, distinguishing weak reference selection from misapplication of relevant evidence before proposing one targeted agent change.

The agent selected exactly the same ordered references across all three runs on only four targets. It used 89, 88, and 86 inspections respectively, and 149, 148, and 146 model turns. All runs stopped early on Friends with Benefits; additional early submissions varied. Temperature remained zero. No target's final prediction was identical across all three runs for any strategy, even though initial requests and automatic reference selections matched exactly.

## Reliability and spending

All **360 predictions across the three 4,000-token runs were valid**, with no length stops. The two newly authorized repeats supplied 240 of those predictions. They made 475 HTTP attempts in total, including one timeout; the initial run made 239 additional attempts.

Repeat 3 timed out on Similar/People Pleasing (day 122), then succeeded on retry. The timed-out request's cost remains unknown. Its full $0.042151783 reservation remains in the ledger; no unverified charge was treated as zero.

| New run | Cap | Reported cost | Conservative accounting | Unknown-cost requests |
|---|---:|---:|---:|---:|
| Repeat 2 | $0.125 | $0.0184686721 | $0.018468780 | 0 |
| Repeat 3 | $0.125 | $0.0177286543 | $0.059880549 | 1 |
| **Combined** | **$0.250** | **$0.0361973264** | **$0.078349329** | **1** |

The combined reported cost is not a complete final bill because one request has unknown cost. Conservative accounting includes that reservation and rounds known costs upward per request. The initial run's separate $0.0185089496 reported cost is excluded from this new $0.25 authorization.

## Reproducibility

Replicate support was committed as `c98a749f`. All 39 tests and the build passed before the repeats. The new fixture test checks distinct directories, unchanged model requests and evidence, default run compatibility, identifier validation, and resume without rerolling. `--replicate` enters the manifest fingerprint only; it does not change prompts, random seeds, or API request bodies.

Both new runs used the same model, exact provider tag, prices, temperature, token allowance, prompts, reference pool, target list, selection seed, retry policy, action limits, and scorer as the initial 4,000-token run. Only the replicate label and lower per-run spending cap differ. All three reports passed offline replay, and the aggregate analysis verified identical initial requests and automatic evidence selections.

Run the saved analysis offline from the repository root:

```bash
node results/learn-room/comparisons/glm-5-3-flash-4000-repeats/analyze.mjs
```

This regenerates `analysis.json`, including every target's three scores and paired gains, each strategy's descriptive statistics, evidence sequences, and spending audit. It makes no API calls.

- [Initial 4,000-token run](../../z-ai-glm-5-3-flash-f6c4db5666d1639d/README.md)
- [Repeat 2 report](../../z-ai-glm-5-3-flash-b9ee92442023a58f/report.html)
- [Repeat 3 report](../../z-ai-glm-5-3-flash-f2d8814acf8f60fa/report.html)
- [Aggregate metrics and target-level comparisons](analysis.json)
- [Offline evidence audit and proposed agent change](audit.md)
