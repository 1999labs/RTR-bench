"""Offline release checks, including the actual Hugging Face local loader.

Run with: uv run --with datasets --with huggingface_hub scripts/validate-hf.py
"""
import ast
import hashlib
import json
import math
import os
from pathlib import Path
import re
import tempfile

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_DATASETS_OFFLINE"] = "1"

import datasets
from datasets import load_dataset
from huggingface_hub import DatasetCard
import yaml

root = Path(__file__).resolve().parents[1]
package = root / "huggingface/RTR-bench"
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = read(package / "release.json")
source = read(root / "data/windows.json")
split = read(root / "data/splits/v1.json")
parts = ["reference", "development", "evaluation"]
quadrants = {
    "tl": "performed+uniting", "tr": "honest+uniting",
    "bl": "performed+dividing", "br": "honest+dividing",
}
assert release["repository"] == "noahmclaughlin/RTR-bench"
assert release["datasetSha256"] == split["datasetSha256"] == sha(root / "data/windows.json")
assert release["splitSha256"] == sha(root / "data/splits/v1.json")
assert (package / "source/windows.json").read_bytes() == (root / "data/windows.json").read_bytes()
assert (package / "source/split-v1.json").read_bytes() == (root / "data/splits/v1.json").read_bytes()
assert release["quadrants"] == quadrants
for name, info in release["files"].items():
    file = package / name
    assert file.stat().st_size == info["bytes"], name
    assert sha(file) == info["sha256"], name
actual_files = {p.relative_to(package).as_posix() for p in package.rglob("*") if p.is_file()}
assert actual_files == set(release["files"]) | {"release.json"}, actual_files

card = DatasetCard.load(str(package / "README.md"))
metadata = card.data.to_dict()
assert metadata["license"] == "cc0-1.0"
assert metadata["language"] == ["en"]
assert metadata["configs"] == [{
    "config_name": "default", "default": True,
    "data_files": [{"split": p, "path": f"data/{p}.jsonl"} for p in parts],
}]
assert "{{" not in card.text
for code in re.findall(r"```python\n(.*?)```", card.text, re.S):
    ast.parse(code)
for link in re.findall(r"\]\(([^)]+)\)", card.text):
    if "://" not in link and not link.startswith("#"):
        assert (package / link.split("#")[0]).exists(), link
citation = yaml.safe_load((package / "CITATION.cff").read_text())
assert citation["type"] == "dataset" and citation["license"] == "CC0-1.0"
assert citation["url"] == "https://huggingface.co/datasets/noahmclaughlin/RTR-bench"

by_day = {w["day"]: w for w in source["windows"]}
seen, total, ties = set(), 0, []
with tempfile.TemporaryDirectory(prefix="rtr-hf-validate-") as cache:
    loaded = load_dataset(str(package), name="default", cache_dir=cache)
    assert set(loaded) == set(parts)
    assert [len(loaded[p]) for p in parts] == [90, 30, 45]
    for part in parts:
        raw_rows = [json.loads(line) for line in (package / f"data/{part}.jsonl").read_text().splitlines()]
        assert loaded[part].to_list() == raw_rows
        assert [r["day"] for r in raw_rows] == split[part]
        assert release["partitions"][part] == {"rows": len(raw_rows), "days": split[part]}
        for row in raw_rows:
            day = row["day"]
            assert day not in seen
            seen.add(day)
            w = by_day[day]
            assert row["id"] == f"mm-{day:03d}"
            assert row["prompt"] == w["word"] and row["partition"] == part
            assert row["submission_count"] == w["n"] == sum(w["counts"].values())
            total += row["submission_count"]
            shares = []
            for key, q in quadrants.items():
                suffix = q.replace("+", "_")
                assert row[f"count_{suffix}"] == w["counts"][key]
                share = row[f"share_{suffix}"]
                assert share == w["counts"][key] / w["n"] and 0 <= share <= 1
                shares.append(share)
            assert math.isclose(sum(shares), 1, abs_tol=1e-12)
            maximum = max(w["counts"].values())
            winners = [q for key, q in quadrants.items() if w["counts"][key] == maximum]
            assert row["winning_quadrants"] == winners
            assert row["winning_share"] == maximum / w["n"]
            if len(winners) > 1:
                ties.append(day)
            assert [row["centroid_x"], row["centroid_y"]] == [w["centroid"]["x"], w["centroid"]["y"]]
            assert row["conviction"] == w["conviction"] and row["polarization"] == w["polarization"]
assert seen == set(by_day) and len(seen) == release["rows"] == 165
assert total == release["submissions"] == 39828
assert ties == [60, 68, 83]
print(f"Verified with datasets {datasets.__version__}: 165 rows, 39,828 submissions, 90/30/45 splits, 3 co-winner ties, exact source copies, card metadata, Python snippets, and package checksums. No Hub uploads or model calls.")
