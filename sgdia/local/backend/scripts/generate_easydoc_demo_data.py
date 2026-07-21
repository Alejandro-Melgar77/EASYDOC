#!/usr/bin/env python3
"""Generate EASYDOC demo data and local training artifact."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ml.demo_dataset import build_demo_dataset
from app.ml.local_training import save_artifact, train_route_model

DATASET_PATH = ROOT / "app" / "ml" / "training_data" / "easydoc_university_march_july.json"
SEED_PATH = ROOT.parent / "database" / "seeds" / "easydoc_demo_seed.json"


def main() -> None:
    dataset = build_demo_dataset()
    artifact = train_route_model(dataset)

    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)

    payload = json.dumps(dataset, indent=2, ensure_ascii=False)
    DATASET_PATH.write_text(payload, encoding="utf-8")
    try:
        SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
        SEED_PATH.write_text(payload, encoding="utf-8")
    except OSError:
        # The container only needs the in-image training artifact; the sibling database folder
        # is available when this command runs directly from the repository checkout.
        pass
    save_artifact(artifact)

    print(f"Dataset EASYDOC: {DATASET_PATH}")
    print(f"Seed demo: {SEED_PATH}")
    print(f"Workflows: {len(dataset['workflow_instances'])}")
    print(f"Training examples: {len(dataset['training_examples'])}")


if __name__ == "__main__":
    main()
