# Predict and Learn: proposed revision

Reporting updates are now applied to the published result summaries using saved answers. The additional Learn control and generation settings below remain proposals; the runner, measured scores, and saved runs are unchanged.

## Keep the core test

- **Predict:** estimate the crowd's share in each of the four quadrants without examples.
- **Learn:** choose and inspect up to three historical examples, then estimate those shares. Start a fresh conversation for each target.
- Keep the dataset, chronological reference/development/evaluation split, and equal weighting of targets.
- Keep the existing squared-error calculation and score out of 100. It measures distribution agreement, not percentage accuracy.

## Make results easier to interpret

Show the historical-average baseline beside the model results. It always predicts the average distribution of the 90 reference windows and scores **85.56** on the current 45 evaluation targets. Calculate it on the same targets as each comparison; retain the uniform baseline in detailed reports.

For both Predict and Learn, report:

- **Score** and its difference from the historical-average baseline, in points.
- **Valid answers**, such as 45/45.
- **Cost**, marking unresolved charges, and the existing uncertainty intervals in detailed reports.

Keep terminal invalid or missing predictions at zero. Pending targets keep a run incomplete. Show failure reasons separately; do not discard failures to improve a score.

These reporting changes can use saved answers without new model calls.

## Add one comparison for Learn

Run **Learn without examples** as an internal control, not a third public track. Use the same Learn instructions, catalog of reference names, action format, eight-turn/action limits, response-token allowance, and recovery rules. Set its inspection budget to zero: it cannot obtain any historical distributions or submission counts. Both conditions may submit early; matching allowances does not guarantee equal token use.

Keep **Learn Gain = Learn − Predict**, describing it as the overall workflow difference. In detailed reports, also show **Learn − Learn without examples** to better separate the benefit of access to evidence from the agent workflow. Keep the existing random and similarity controls.

## Choose settings before another evaluation

Use the 30 development targets to choose reasoning/output allowances with enough headroom and check provider compatibility. Record the exact settings and spending ceiling before paid evaluation. Do not selectively raise limits or reroll failed final answers. The next token allowance remains undecided until that development check is planned and budgeted.

Give the revised experiment a separate protocol version and result directory. Preserve the current runs under their recorded settings. Existing evaluation outcomes informed this proposal, so further work on those targets is exploratory; stronger confirmation needs fresh targets fixed before their results are examined.

**Next step:** plan a small, budgeted development comparison of Learn with and without access to examples before more final runs.
