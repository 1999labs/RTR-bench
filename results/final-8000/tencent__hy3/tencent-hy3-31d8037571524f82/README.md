# HY3 — incomplete evaluation

Provider: GMICloud (`gmicloud/bf16`). The original 8,000-token, 45-target, four-condition configuration is preserved.

Three Predict episodes completed with valid answers. The next prompt (day 133) received HTTP 400 `unsupported_operation` from GMICloud on all three permitted attempts, including two identical resumes. The episode remains pending. Learn and the controls have not started. There is no aggregate headline score.

Known provider-reported charges total $0.002524700. Three unresolved charges retain $0.124020480 in conservative reservations; total ledger accounting is $0.126545180, within the $1 cap. This is not an invoice.

No completed prediction, prompt, provider, generation setting, or attempt was changed or discarded. An unchanged resume cannot issue another attempt for day 133 because the three-attempt limit is exhausted. Continuing requires resolving the provider/setup problem and explicitly deciding how to handle the retry policy or provider identity; it must not silently reroll saved answers or mix providers in this run.

- [Partial report](report.md)
- [Saved manifest](manifest.json)
- [Spending ledger](spending.json)
- [Campaign status](../../README.md)
