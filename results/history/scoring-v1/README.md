# Scoring v1 snapshot

These are the exact aggregate reports and charts from commit `39da6d34ad0330f7693ce7da2d95b2a9f7bdace0`, before the scoring-v2 revision. The original files did not carry a scoring-version field; their placement here identifies them as v1 without altering their contents.

V1 accepted only the dataset's legacy singular `dominant` quadrant, even for tied crowd counts, used a 25.0% uniform-quadrant baseline, and did not publish separate 4/4 consistency metrics. Its Brier target was one-hot on that singular crowd label. The code already accepted a unique 2–1–1 plurality, although the README incorrectly described a three-of-four requirement.

V2 accepts all crowd co-winners, recalculates the affected metrics and baselines, reports consistency and invalid/missing responses separately, and counts wholly invalid attempted windows as misses. The raw responses, generation prompts, and dataset were not changed. No model was retested to produce v2. The tied windows are Republicans (60), Police Departments (68), and Freedom (83).

- [Original scores](scores.json)
- [Original leaderboard](leaderboard.md)
- [Original own-interpretation table](interpretations.md)
- [Original accuracy chart](leaderboard.svg)
- [Original score/cost chart](leaderboard-scatter.png)

New results are in [the current results folder](../../).
