"""Build public tables and notes exclusively from independently verified final runs.

Offline: node results/final-8000/analyze.mjs; uv run scripts/chart-tracks.py;
python3 scripts/publish-final-results.py
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'results/final-8000'
read = lambda p: json.loads(p.read_text())
verified = read(OUT / 'verified-results.json')
state = read(OUT / 'shared-campaign.json')
plan = read(ROOT / state['plan'])
assert state['status'] == 'complete' and len(verified['results']) == 11
rows = verified['results']
assert set(r['model'] for r in rows) == set(plan['authorizedModels'])
chart = read(ROOT / 'results/predict-learn-scatter.json')
assert chart['verifiedResultsSha256'] == hashlib.sha256((OUT / 'verified-results.json').read_bytes()).hexdigest()
providers = {'relace/fp4':'Relace', 'wafer/us':'Wafer', 'inferact-vllm/nvfp4':'Inferact vLLM',
             'xiaomi/fp8':'Xiaomi', 'sail-research/fp4/us':'Sail Research', 'tencent/fp8':'Tencent',
             'google-ai-studio':'Google AI Studio', 'openai':'OpenAI (Flex)', 'anthropic':'Anthropic',
             'deepinfra/fp4':'DeepInfra', 'primeintellect/fp4':'PrimeIntellect', 'dekallm/bf16':'DekaLLM'}
name = lambda r: r['model'].split('/')[-1]
track = lambda r, t: next(s for s in r['summaries'] if s['strategy'] == t)
signed = lambda v: f'{v:+.2f}'.replace('-', '−')
ci = lambda values: f'{values[0]:.2f} to {values[1]:.2f}'.replace('-', '−')
provider = lambda r: providers[r['provider']] + (f" ({r['quantization']})" if r['quantization'] not in [None, 'unknown'] else '')
cost = lambda s: ('≥' if s['unknownChargeReservations'] else '') + f"${s['costUsd']['known']:.5f}"
base = rows[0]['baselines']['constantScore']
uniform = rows[0]['baselines']['uniformScore']
for r in rows:
    assert r['offlineResumeVerified'] and r['baselines'] == rows[0]['baselines']
    assert all(s['pending'] == 0 for s in r['summaries'])
header = '| Model | Provider | Predict | Predict Cost | Learn | Learn Gain | Learn Cost | Total Cost |\n|---|---|---:|---:|---:|---:|---:|---:|'
table = [header, f'| Historical-average baseline | No model | {base:.2f} | — | {base:.2f} | — | — | — |']
for r in rows:
    p, l = track(r, 'none'), track(r, 'agent')
    total = ('≥' if r['unknownReservations'] else '') + f"${r['reportedCostUsd']:.5f}"
    table.append(f"| {name(r)} | {provider(r)} | {p['score']:.2f}<br>{p['valid']}/45 valid | {cost(p)} | {l['score']:.2f}<br>{l['valid']}/45 valid | {signed(r['learnGain'])} | {cost(l)} | {total} |")
table = '\n'.join(table)
bestp = max(rows, key=lambda r: track(r,'none')['score'])
bestl = max(rows, key=lambda r: track(r,'agent')['score'])
pabove = sum(track(r,'none')['score'] > base for r in rows)
labove = sum(track(r,'agent')['score'] > base for r in rows)
negative = sum(r['learnGain'] < 0 for r in rows)
deep = next(r for r in rows if name(r) == 'deepseek-v4.1-flash-1017')
findings = (f"**{name(bestp)} led Predict at {track(bestp,'none')['score']:.2f}; {name(bestl)} led Learn at {track(bestl,'agent')['score']:.2f}.** "
    f"{pabove} of 11 models beat the {base:.2f} historical-average baseline on Predict, and {labove} did on Learn. "
    f"That baseline uses the same reference-derived distribution for every target; uniform predictions score {uniform:.2f}. "
    "Scores in the mid-80s therefore indicate closeness to a simple baseline, not 80%-plus classification accuracy.\n\n"
    f"Learn scored lower than Predict for {negative} of 11 models, so gathering examples did not consistently improve this workflow. "
    f"DeepSeek's {signed(deep['learnGain'])}-point gain includes an answer-completion difference: {track(deep,'none')['valid']}/45 valid Predict answers versus {track(deep,'agent')['valid']}/45 Learn answers. "
    "It should not be read as a pure benefit from historical evidence. These are single runs on 45 targets from one audience; small rank differences and evidence-only explanations remain uncertain.")
intro = ('All eleven models use the same 45 evaluation targets and 8,000-token response allowance. '
         'Scores measure distribution agreement, not percentage accuracy. Counts show valid answers; failed terminal answers score zero and were not rerolled. '
         '[Verification, intervals, and raw records](https://github.com/1999labs/RTR-bench/tree/main/results/final-8000).')
notes = ('Predict Cost and Learn Cost cover their respective 45-target tracks. Total Cost also includes the random and text-similarity controls. '
         'A **≥** marks a known subtotal with unresolved charges; conservative reservations remain in the spending ledger. '
         'The plots use those same subtotals, so affected cost positions and the purple Pareto frontier are provisional. '
         'The dashed guide shows the best observed score available at each budget; GLM Flash is the sole Predict frontier model. Higher scores and lower costs are better. In the combined plot, **P = Predict** and **L = Learn**.')
body = intro + '\n\n' + table + '\n\n' + notes + '\n\n' + '\n\n'.join([
    '![RTR-Bench (Predict)](results/predict-scatter.png)',
    '![RTR-Bench (Learn)](results/learn-scatter.png)',
    '![RTR-Bench (Learn + Predict)](results/predict-learn-scatter.png)']) + '\n\n### Findings\n\n' + findings + '\n\n'
p = ROOT / 'README.md'; s = p.read_text()
a = s.index('## Results\n'); b = s.index('## Optional usage', a)
s = s[:a] + '## Results\n\n' + body + s[b:]
if 'The [selected five-model campaign]' in s:
    a = s.index('The [selected five-model campaign]'); b = s.index('## Results', a)
    s = s[:a] + s[b:]
s = s.replace('These commands require RTR-bench **0.2.0 or newer** on npm. To select that exact release, replace `npx rtr-bench` with `npx rtr-bench@0.2.0`.', 'Use RTR-bench **0.2.2** for the current runner and defaults. To select that exact release, replace `npx rtr-bench` with `npx rtr-bench@0.2.2`.')
s = s.replace('In version 0.2.1, the public commands default', 'Since version 0.2.1, the public commands default')
a = s.index('The [final evaluation plan]') if 'The [final evaluation plan]' in s else s.index('The [final campaign]'); b = s.index('\n\n', a)
s = s[:a] + 'The [final campaign](results/final-8000/README.md) uses 8,000 tokens for all eleven models. The earlier 4,000-token GLM Flash run remains archived and is excluded from the current table. The [shared budget plan](docs/final-campaign-shared-budget.json) records the campaign’s $10 ceiling, preserved prior costs, and provider snapshots.' + s[b:]
p.write_text(s)
p = ROOT / 'huggingface/RTR-bench/README.md'; s = p.read_text()
a = s.index('<!-- FINAL_RESULTS_START -->') + len('<!-- FINAL_RESULTS_START -->')
b = s.index('<!-- FINAL_RESULTS_END -->')
p.write_text(s[:a] + '\n' + body + s[b:])

# Reconcile every unique billed/reserved ledger, including superseded HY3/GLM runs.
directories = list(dict.fromkeys([r['directory'] for r in plan['closedRuns']] + [r['directory'] for r in state['runs']]))
ledgers = [read(ROOT / d / 'spending.json') for d in directories]
entries = [e for ledger in ledgers for e in ledger['entries']]
accounted = sum(e['chargedUnits'] if e['chargedUnits'] is not None else e['reservedUnits'] for e in entries) / 1e9
unknown = [e for e in entries if e['chargedUnits'] is None]
assert abs(accounted - state['accountedUsd']) < 1e-9 and accounted <= 10
# Report actual cost fields rather than nano-dollar rounding used for reservations.
known = 0
for d in directories:
    report = read(ROOT / d / 'report.json')
    known += sum(s['costUsd']['known'] for s in report['summaries'])
accounting = {'limitUsd':10, 'accountedUsd':accounted, 'reportedCostUsd':known,
              'unknownReservations':len(unknown), 'unknownReservedUsd':sum(e['reservedUnits'] for e in unknown)/1e9,
              'countedDirectories':directories, 'excludesDuplicateDeepSeekHistory':True}
(OUT / 'campaign-accounting.json').write_text(json.dumps(accounting, indent=2) + '\n')

report = ['# Final Predict / Learn evaluation — eleven models',
    'Status: **complete and independently verified**. Each model has 45 terminal outcomes in each of four conditions (180 per model). A terminal outcome can be a zero-scored failure; complete does not mean every answer was valid.',
    '## Findings', findings, '## Results', table,
    'Scores measure distribution agreement, not percentage accuracy. The baseline uses only reference data. Predict and Learn costs exclude controls; Total Cost includes both controls. **≥** identifies unresolved charges.',
    '## Frozen settings',
    'All runs use evaluation days 130–174, the same 90 historical reference windows, Predict (`none`), random examples (`random`), text-similar examples (`similar`), and Learn (`agent`). Learn may inspect three examples across eight actions and eight model turns. Settings: seed 7, `transfer-check-v1`, 8,000 output tokens per response, up to three HTTP attempts per model call, 60-second request timeout, temperature zero where supported, and provider-default reasoning. Model/provider/quantization settings are recorded below and in each manifest. Data, prompts, and scoring stayed fixed. Failures were not rerolled.',
    'The original [plan](../../docs/final-run-plan-8000.md) and [DeepSeek budget amendment](budget-amendment.md) are preserved. The later [shared $10 plan](../../docs/final-campaign-shared-budget.json) authorized all eleven models, including a fresh GLM Flash run at 8,000 tokens and HY3 through Tencent. The earlier GLM Flash 4,000-token result and HY3 GMICloud partial run are excluded from scores but remain in campaign spending. DeepSeek’s copied partial history is counted only once.',
    '## Target uncertainty and baselines',
    '| Model | Track | Score | vs historical baseline | Valid / 45 | Exploratory 95% interval |\n|---|---|---:|---:|---:|---|']
for r in rows:
    for label, strategy in [('Predict','none'),('Learn','agent')]:
        t = track(r,strategy)
        report.append(f"| [{name(r)}]({r['directory'].removeprefix('results/final-8000/')}/README.md) | {label} | {t['score']:.2f} | {signed(t['score']-base)} | {t['valid']}/45 | {ci(t['scoreCI'])} |")
report += ['\n| Model | Learn Gain | Paired exploratory 95% interval |\n|---|---:|---|']
for r in rows: report.append(f"| {name(r)} | {signed(r['learnGain'])} | {ci(r['learnGainCI'])} |")
report += ['Intervals resample matched target entity groups. They are exploratory, uncorrected for multiple comparisons, and do not measure repeated-run variability or uncertainty across independent people. Learn Gain includes selection, inference, and answer-completion differences. The ten-target [development evidence pilot](../development-evidence-pilot-v1/README.md) is separate from these final results; the larger proposed development experiment was not run.',
    '## Costs and preserved interruptions',
    f"The entire authorized final campaign has **${known:.8f} in reported charges**, a lower bound, and **${accounted:.8f} accounted against the $10 ceiling**. The latter includes **{len(unknown)} unresolved-charge reservations totaling ${accounting['unknownReservedUsd']:.8f}**, plus conservative ledger rounding. It is a spending-control total, not an invoice. See [exact reconciliation](campaign-accounting.json).",
    'The failed GMICloud HY3 route stopped after three Predict targets when all allowed attempts for day 133 returned HTTP 400. The fresh Tencent run uses a separate declared identity and keeps those prior costs. Tencent advertises time-of-day prices; the cap reserves the highest advertised rate while actual usage costs come from responses. HY3 Tencent control timeouts, MiMo timeouts, and DeepSeek TTFT-guard/empty-response charges remain reserved where billing is unresolved. Explicitly unbilled MiniMax rate-limit errors are preserved without unknown-charge reservations. Provider pauses and backoff are included in wall-clock elapsed times.',
    'Unresolved-charge counts in the published runs: ' + ', '.join(f"{name(r)}: {r['unknownReservations']}" for r in rows if r['unknownReservations']) + '. The preserved failed HY3 GMICloud run has three additional unresolved charges. Counts and reservations remain in the exact accounting file.',
    'GPT-OSS’s original first request was rejected because the provider’s advertised output price increased from $0.075 to $0.076 per million tokens. The [price amendment](../../docs/final-campaign-price-amendment.json) preserves that rejected request and its reservation, then starts the same model/provider/protocol with the refreshed ceiling. No prediction existed to reroll.',
    'PrimeIntellect subsequently changed prices again after 76 terminal outcomes. The [provider amendment](../../docs/final-campaign-provider-amendment.json) preserves and excludes that partial run from final scores and uses DekaLLM (bf16), the original benchmark provider, for the full GPT-OSS evaluation. Both PrimeIntellect attempts remain in campaign spending. This was a provider-reliability decision, not selection between observed scores.',
    '## Verification and reproduction',
    'The [offline verifier](analyze.mjs) replays saved requests and evidence traces, independently recomputes each score from crowd counts, checks frozen configuration and all 180 outcomes, reconciles ledger entries, checks preserved DeepSeek continuation records, and resumes every completed run with network access forbidden. [Verified metrics](verified-results.json) are the sole source of the public tables and charts. No further model calls are needed to regenerate them.',
    '```bash\nnode results/final-8000/analyze.mjs\nuv run scripts/chart-tracks.py\npython3 scripts/publish-final-results.py\n```',
    'The chart script reproduces the original cyan-square/purple-Pareto style for individual tracks and uses a distinct color per model for paired Predict/Learn points. Plot data and report hashes are saved in [chart metadata](../predict-learn-scatter.json).',
    '- [Shared campaign execution record](shared-campaign.json)\n- [Earlier five-model execution record](selected-five-execution.json)\n- [DeepSeek pause](deepseek-provider-pause.json)\n- [DeepSeek budget amendment](budget-amendments.json)']
# Join table rows with single newlines, other blocks with paragraphs.
text = ''
for part in report:
    text += ('\n' if part.startswith('|') and text.rstrip().endswith('|') else '\n\n') + part
(OUT / 'README.md').write_text(text.lstrip() + '\n')
for r in rows:
    d = ROOT / r['directory']; raw = read(d / 'report.json')
    text = f"# {name(r)} — final evaluation\n\nProvider: **{provider(r)}**, requested route `{r['provider']}`. Actual response providers: {', '.join(r['actualProviders'])}. All 45 targets ran in each condition under the [campaign protocol](../../README.md).\n\n"
    text += '| Condition | Score | vs historical baseline | Valid / 45 | 95% interval | Reported cost |\n|---|---:|---:|---:|---|---:|\n'
    for strategy,label in [('none','Predict'),('random','Random examples'),('similar','Similar examples'),('agent','Learn')]:
        s=track(r,strategy)
        text += f"| {label} | {s['score']:.8f} | {signed(s['score']-base)} | {s['valid']}/45 | {ci(s['scoreCI'])} | {cost(s)} |\n"
    text += f"\nLearn Gain: **{signed(r['learnGain'])}** points; paired exploratory 95% interval **{ci(r['learnGainCI'])}**. Historical-average baseline: {base:.8f}; uniform baseline: {uniform:.8f}.\n\n"
    text += f"{r['valid']}/180 valid final predictions; {r['apiCalls']} HTTP attempts, {r['apiErrors']} API/transport errors, {r['lengthStops']} responses stopped at the token limit. Wall-clock span: {r['elapsedMinutes']:.2f} minutes, including retries and pauses. Known total cost including controls: ${r['reportedCostUsd']:.10f}; ledger accounted: ${r['accountedUsd']:.9f}; unresolved charges: {r['unknownReservations']}.\n\n"
    failures = [x for x in raw['rows'] if x['outcome']['status'] != 'valid']
    if failures:
        text += 'Terminal failures remain in the denominator with score zero; they were not rerolled:\n\n'
        text += '\n'.join(f"- {x['strategy']}, day {x['day']} ({x['word']}): {x['outcome']['status']} — {x['outcome'].get('failure') or 'No valid terminal prediction'}" + (f" (probability sum: {x['outcome']['originalSum']:.6g})" if x['outcome'].get('originalSum') is not None else '') + '.' for x in failures) + '\n\n'
    text += 'The offline verifier independently recomputed scores, replayed saved requests/traces, checked the spending ledger, and resumed this completed run with network calls forbidden. Learn Gain measures the whole workflow, including completion differences. Intervals describe target variation, not repeated model runs.\n\n'
    text += '- [Full report](report.md)\n- [Interactive traces](report.html)\n- [Raw report](report.json)\n- [Manifest](manifest.json)\n- [Spending ledger](spending.json)\n'
    (d / 'README.md').write_text(text)
print('Generated eleven-model tables, findings, individual notes, and campaign accounting.')
