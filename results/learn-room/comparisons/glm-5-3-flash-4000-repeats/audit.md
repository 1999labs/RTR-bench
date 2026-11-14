# Evidence audit: what helped, what hurt, and one proposed change

This offline audit reviews 30 saved agent episodes: all five targets helped in every 4,000-token run, plus the five largest mean losses among targets harmed in every run. It uses the three development runs in [the repeatability report](README.md). No API calls were made, no benchmark scores or prompts changed, and the 45 final targets were not used.

## Finding

The evidence points to both weak analogy selection and inappropriate transfer of otherwise related examples. Better topic matching alone is unlikely to address every observed failure. The most actionable hypothesis is **transferring an audience judgment across both axes when the analogy supports only one, or a different interpretation of the target**.

This is an inference from selected references and final probabilities, not a causal diagnosis of the model's reasoning. The no-example response is a separate conversation, not a recorded initial belief of the same agent. Differences below compare conditions; they are not observed intermediate belief updates. These ten targets were selected after seeing their outcomes, so they are diagnostic cases rather than an unbiased validation set.

## Five consistently helped targets

| Target | Mean gain | Evidence and observed behavior |
|---|---:|---|
| Friends with Benefits | +11.60 | All runs selected Open Relationships and One Night Stands, then stopped. Mean predicted dividing share was 66%, versus 31% without examples and 85.1% observed. Closely related relationship examples supported a useful broad correction, although the agent still underestimated performed/dividing. |
| Drake | +11.18 | Kendrick Lamar was selected in every run; its observed performed/dividing share was 94.7%. Drake's corresponding agent prediction averaged 69.3%, versus 35.7% without examples and 79.7% observed. Other references varied substantially, including politicians and cultural events. A useful close comparison remained available despite mixed additional evidence. |
| TikTok | +8.83 | Every run selected The Internet and Content Creators; two also selected Gen Z. The Internet and Gen Z supplied strong performed/dividing signals. Mean target performed/dividing prediction was 61%, versus 38.3% without examples and 78.8% observed. |
| Kamala Harris | +7.19 | All runs selected Donald Trump, Joe Biden, and Barack Obama, in differing orders. Mean dividing prediction was 75.7%, versus 43.7% without examples and 89.2% observed. The agent still overestimated honest/dividing and underestimated performed/dividing. This is a partial success, not evidence that all aspects of the analogy transferred correctly. |
| Instagram | +3.13 | All runs selected The Internet, Content Creators, and Dating Apps. Mean performed/dividing prediction was 50.3%, versus 34% without examples and 54.1% observed. The resulting joint distributions were very close to the audience's. |

These cases show that the agent can use relevant evidence selectively; it is not uniformly failing to understand observations. Every helped case scored higher with the agent than with the crude equal-weight average of its inspected references.

## Five largest consistent harms

| Target | Mean gain | Evidence and likely failure mode |
|---|---:|---|
| Kim Jong-un | -23.90 | Every run selected Donald Trump and Barack Obama, plus Flags or National Anthems. None of these selected distributions had substantial performed/dividing mass. Mean target performed/dividing prediction was only 9%, versus 34.3% without examples and 86.7% observed. The examples were thematically associated, but offered a misleading quadrant pattern for this target. Selection mismatch and over-transfer are both plausible. |
| Rainbows | -16.62 | All runs selected Flags and Same-sex Marriage; additional references were Disney World or National Anthems. This set emphasizes symbols and social identity, while the target distribution was 87.6% honest/uniting. The agent averaged 31% honest/uniting, versus 56% without examples. The selections suggest an overly narrow contextual association, but the crowd shares do not reveal participants' intended interpretation. The agent should not treat an associated context as the only meaning of an ambiguous prompt. |
| Defense Contractors | -13.72 | Every run selected Prisons and Fossil Fuels, plus Police Departments or Capitalism. These references were largely honest/dividing. The agent's dividing marginal was closer to the target, but its performed marginal became much less accurate; see below. Institutional similarity did not justify transferring the performed/honest balance. |
| Tom Brady | -11.81 | Every run selected Professional Sports, whose observed distribution was about 90% uniting. Other examples varied among sports, entertainment, and political figures. The agent's mean dividing prediction was 30%, versus 52.3% without examples and 84.9% observed. General attitudes toward a category may not transfer to a particular person. Some selected references had substantial honest/dividing mass, so this is not simply an absence of that signal. |
| Billionaires | -9.57 | Capitalism and Elon Musk appeared in every run. Later runs also selected Jeffrey Epstein or Universal Basic Income, both strongly performed/dividing. Despite that countervailing evidence, the agent's performed/dividing prediction averaged 29.3%, versus 43% without examples and 80.7% observed. This looks compatible with misweighting mixed evidence, alongside imperfect comparisons; it does not establish which reference caused the error. |

### The two-axis pattern

These are marginal shares derived from the four-quadrant distributions, averaged across runs. They are diagnostics, not alternative scores.

| Target | Dividing: no examples → agent → observed | Performed: no examples → agent → observed |
|---|---|---|
| Kim Jong-un | 55.0% → 58.7% → 94.6% | 75.3% → 48.3% → 90.4% |
| Defense Contractors | 58.7% → 89.0% → 93.7% | 77.0% → 33.7% → 83.5% |
| Billionaires | 64.3% → 76.7% → 92.2% | 72.7% → 45.3% → 85.7% |

In each case, the dividing marginal moved closer to the target while the performed marginal moved farther away. Knowing that an audience finds one related subject divisive does not establish why it finds another subject divisive, or whether it sees the division as performed or honest.

The same issue is partially visible in the successful Kamala Harris case: dividing predictions improved, while the performed marginal became slightly less accurate. A positive total gain can hide an incorrect transfer on one axis.

### Why not just average the evidence?

As an untuned diagnostic, `audit.mjs` computes the equal-weight mean of each episode's inspected distributions and scores that mean. This is not a new official strategy or a test of semantic relevance. Averaged across runs, this diagnostic scored below no examples on all five harmful targets, so the available evidence was not a reliable distributional template. However, Kamala Harris's reference average scored only 75.64 while the agent scored 92.05 and no examples scored 84.86. The agent can extract useful information from a set whose average is misleading. Reference-average error therefore cannot by itself distinguish bad selection from bad use.

## One proposed change: check transfer on each axis

Add an opt-in, versioned agent prompt variant, provisionally `transfer-check-v1`, with this instruction block:

> Before transferring a reference's audience distribution, assess whether the comparison applies separately to performed versus honest and to uniting versus dividing. A shared topic, category, or association alone is not enough to transfer both judgments. A divisive response does not by itself establish whether that division is performed or honest. Consider differences between the target and reference, including an individual versus a broad category. Do not narrow an ambiguous target's meaning solely to match a selected reference. Use an example only for the judgments it supports; discount it or ignore it when transfer is weak. Keep the final four-quadrant prediction joint: do not assume the two axes are statistically independent.

This is one change to evidence-use instructions. Keep the action schema, catalog, reference pool, inspection and turn limits, output allowance, scoring, and provider fixed. Retain the existing policy as the default and preserve replay of its saved runs. Do not add target-specific exceptions, expose target outcomes to the agent, or hard-code which quadrant these audited targets should receive.

The intended behavior is selective transfer rather than blanket distrust of references: preserve the useful corrections for relationships, artists, platforms, and politicians while reducing unsupported transfer between axes or meanings. The audit does **not** demonstrate that this instruction will improve scores.

## Next implementation and evaluation

1. Implement the proposed prompt as an optional policy with its own version/hash, while keeping existing records replayable. Add fixtures verifying policy selection, unchanged budgets and actions, no target-label access, and identical default requests. This step needs no API spending.
2. Before an authorized paid comparison, declare the settings and budget. For a more focused evidence-use test, hold each existing episode's selected references and order fixed and compare the old and new prediction instructions. Re-running the full agent also permits selection changes, which should be reported separately.
3. Evaluate across all 30 development targets, not just these ten selected cases, and report aggregate gains plus whether known benefits were lost. Reuse the established three-repeat approach when assessing modest changes. Keep the final 45 targets untouched until the policy is frozen.

The original audit produced this proposal without implementing a policy or running additional model experiments.

**Subsequent implementation:** the optional `transfer-check-v1` policy and offline fixture coverage are now implemented; see the [policy documentation](../../../../docs/learn-room.md). The original proposal above is retained as the audit record. The [first live development pilot](../../z-ai-glm-5-3-flash-860b02af84d2ba19/README.md) and two repeats are complete; see the [three-run policy comparison](../glm-5-3-flash-policy-repeats/README.md). The new agent averaged 85.67 versus 83.66 for the original, but still trailed no examples in each run. Results remain exploratory and the original policy remains the default.

## Reproduce the audit

```bash
node results/learn-room/comparisons/glm-5-3-flash-4000-repeats/audit.mjs
```

The script makes no API calls. It replays the three saved reports, selects the ten cases by the declared rule, verifies scores, and writes [audit.json](audit.json) with all 30 episodes' selected reference IDs, texts, distributions, submission counts, target predictions, observed distributions, and derived diagnostics. [audit.mjs](audit.mjs) contains the calculation; the case interpretations and proposed prompt above are human-readable analysis rather than automatically inferred causal labels.
