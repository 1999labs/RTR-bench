# Budget reallocation within the selected five-model cap

DeepSeek stopped before a new request because its original $0.50 limit could not cover another conservative reservation. It had reported $0.06960247168 in charges and received five HTTP 429 `ttft_deadline_guard` errors with no usage data. Those errors retain reservations; they were not declared free or removed.

The three completed runs are closed to further paid calls. Their combined accounting amount, including MiMo's two unresolved timeout reservations, is **$0.512527033**. Reallocating unused allowance gives DeepSeek **$1.20** and retains HY3's **$1.00** cap. The combined upper accounting bound is **$2.712527033**, below the original **$2.75** five-model cap. No additional models are authorized by this reallocation.

This is an execution-budget change only. Model/provider, 8,000-token allowance, prompts, reference access, actions, retries, timeout, targets, scoring, and all recorded outputs remain unchanged.

The original stopped run remains at `results/final-8000/deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-d9d8c26df584a321`. The active continuation is `results/final-8000/deepseek__deepseek-v4.1-flash-1017/deepseek-deepseek-v4-1-flash-1017-08a69325bd0d847d`. Changing the budget changes the run fingerprint, so the continuation was created by copying the records and changing only the budget and its audit metadata. All 122 episode files were verified byte-for-byte; all 126 ledger entries and attempts, report rows, summaries, and baselines were identical before continuation. Every saved failure is preserved. No prior question was rerun.

The active run's cost and attempt totals already include the imported records. **Do not add the historical partial run's totals a second time.** The offline analyzer explicitly selects the active run using [budget-amendments.json](budget-amendments.json).

The initial [campaign plan](../../docs/final-run-plan-8000.md) is retained as the original proposal. For this DeepSeek continuation, use its new $1.20 limit and original output root:

```bash
node src/cli.ts read-the-room deepseek/deepseek-v4.1-flash-1017 \
  --controls --provider sail-research/fp4/us --split evaluation --limit 45 \
  --budget 3 --seed 7 --max-model-calls 8 --max-tokens 8000 \
  --agent-policy transfer-check-v1 --max-usd 1.20 \
  --output results/final-8000/deepseek__deepseek-v4.1-flash-1017
```

An identical command resumes saved terminal episodes; it does not reroll them. The original $0.50 command addresses the preserved stopped run and should not be used to continue this evaluation. HY3's command and $1 cap are unchanged. No source runner or scoring code was changed during this reallocation.

## Provider-recovery pause

After the budget resume, DeepSeek reached 155 terminal episodes (122 valid) but continued to receive repeated `ttft_deadline_guard` rejections. It was deliberately paused while waiting after a rejection, with no model request in flight. The process exit was confirmed before removing its stale lock. Its current report and every attempt were saved. HY3 was moved ahead in the queue under its unchanged $1 cap; DeepSeek subsequently resumed and completed under its existing $1.20 limit. This changes only scheduling, not model requests, scoring, attempts, or saved outcomes. DeepSeek’s elapsed time includes this deferred interval and should not be interpreted as pure model latency. See [pause record](deepseek-provider-pause.json).

HY3 completed three Predict episodes before GMICloud returned HTTP 400 `unsupported_operation`. Two identical resumes used the remaining saved attempt slots and received the same error. All three attempts and their unknown-charge reservations are retained. HY3 remains incomplete; no provider, prompt, generation setting, or completed answer was changed. DeepSeek resumed after this provider interruption and finished all 180 episodes. HY3 has exhausted the three permitted attempts for that pending prompt; an unchanged command cannot progress further.
