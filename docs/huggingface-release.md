# Hugging Face dataset release

Target: [noahmclaughlin/RTR-bench](https://huggingface.co/datasets/noahmclaughlin/RTR-bench).

The local release folder is [`huggingface/RTR-bench/`](../huggingface/RTR-bench/). Its [README](../huggingface/RTR-bench/README.md) is the dataset card. Preparation and validation are local; neither command below publishes anything or calls a model.


## Current publication — November 15, 2026

Uploaded with the `hf` CLI to dataset commit [`4cd62fac70fc4cb55602686c4ca7bc42c63bbe84`](https://huggingface.co/datasets/noahmclaughlin/RTR-bench/commit/4cd62fac70fc4cb55602686c4ca7bc42c63bbe84).

- All 19 published package files downloaded and matched the reviewed local files byte-for-byte.
- The actual remote `load_dataset` call at that revision loaded 90 reference, 30 development, and 45 evaluation rows, totaling 39,828 submissions.
- CC0 metadata was verified. All five frozen data/source files are byte-identical to the prior publication.
- The package includes the eleven-model table, three charts, findings, and current Predict/Learn instructions.
- The release manifest identifies source commit `7a8cab7e` and CLI package version 0.2.2. Dataset publication and npm publication are separate; see [npm release verification](release-0.2.2-verification.md) for registry status.

## Original publication (historical)

Published to the user's dataset repository on November 14, 2026 (America/New_York).

- Dataset: https://huggingface.co/datasets/noahmclaughlin/RTR-bench
- Commit: [`2f6fa74406ad4e3a72489c881b560d9b2ced937e`](https://huggingface.co/datasets/noahmclaughlin/RTR-bench/commit/2f6fa74406ad4e3a72489c881b560d9b2ced937e)
- Verified all 11 published package files byte-for-byte against the reviewed local release.
- Loaded the published commit with Hugging Face Datasets: 90 reference, 30 development, and 45 evaluation rows; 39,828 submissions total.
- Verified dataset card license metadata: `cc0-1.0`.
- The existing remote `.gitattributes` file was preserved.
- At publication verification, the web viewer API returned `ResponseNotReady` (indexing/server delay). Direct downloads and `load_dataset` at the published commit passed; viewer indexing remains to be rechecked.

## Package

- 165 JSONL rows in the original 90 reference / 30 development / 45 evaluation splits.
- Aggregate counts, full-precision quadrant shares, all co-winning quadrants, and original descriptive metrics.
- Byte-identical source data and split manifest for compatibility with the runner.
- CC0 data dedication, MIT documentation/metadata license, and citation.
- Verified eleven-model result summaries, chart source metadata, and three SVG/PNG charts.
- A release manifest with provenance and checksums for every package file.

Hugging Face YAML configuration explicitly selects only the three JSONL files. The source JSON and release metadata are not extra dataset rows. The card describes **Predict** (no historical examples) and **Learn** (up to three selected examples), with the current eleven-model results, three charts, and concise findings. The original winning-quadrant benchmark remains separately documented.

## Prepare and verify

From the repository root with Node.js 22.18 or newer:

```bash
node scripts/prepare-hf.mjs
uv run --with datasets --with huggingface_hub scripts/validate-hf.py
```

The exporter validates the frozen source fingerprint and split before writing. It derives shares directly from integer counts and includes all crowd co-winners rather than relying on the legacy single-winner field. It never queries the production database or refreshes the source dataset. The package's card, license notice, CC0 text, and citation are authored files; the exporter regenerates JSONL, source copies, the MIT text, result/chart mirrors, and the release manifest. Re-run it after editing package documentation to refresh checksums.

Validation loads the directory with the actual Hugging Face Datasets library, with Hub access disabled. It checks split assignment, source equivalence, all counts/shares, tie handling, hashes, card configuration, local links, Python example syntax, and the package file allowlist. Validation dependencies are installed in an isolated uv environment, outside project dependencies.

The release manifest records the source checkout’s HEAD and CLI version. Commit the final source/results and authored card before preparing the manifest; this identifies the source used for the package. The card links to current GitHub protocols and results; use the manifest’s source commit when reproducing the exact release. A new dataset snapshot needs its own reviewed split/version; do not silently append future windows to this release.

## Upload after review

Authenticate in the terminal if needed; do not put credentials into the package:

```bash
hf auth whoami
hf auth login
```

Upload only the prepared folder, explicitly to the dataset repository root:

```bash
hf upload noahmclaughlin/RTR-bench huggingface/RTR-bench . --repo-type dataset --commit-message "Publish verified Predict and Learn results for eleven models"
```

This uploads the reviewed package without deleting unrelated remote files. Inspect any existing remote content before publishing. The current release requires no GPU, hosted model, or paid inference.

After upload, record the Hugging Face commit and verify:

1. The dataset card, CC0 metadata, and all package files render correctly.
2. The viewer shows three splits with 90 / 30 / 45 rows.
3. `load_dataset("noahmclaughlin/RTR-bench", revision="<uploaded-commit>")` loads those same rows.
4. The hashes of downloaded data files match `release.json`.

Keep GitHub as the canonical home for implementation and scoring. The dataset repository packages the shared data and links to the versioned protocols; it does not run an evaluation service.
