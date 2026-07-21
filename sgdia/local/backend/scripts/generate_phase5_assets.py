#!/usr/bin/env python3
"""Generate local agent corpus and evaluated operational-training artifacts."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.ml.agentic_dataset import build_agentic_cases
from app.ml.demo_dataset import build_demo_dataset
from app.ml.local_training import save_artifact, train_route_model
from app.ml.operational_training import build_training_report
from app.ml.training_governance import build_training_readiness

DATA_DIR = ROOT / "app" / "ml" / "training_data"
ARTIFACT_DIR = ROOT / "app" / "ml" / "artifacts"


def main() -> None:
    dataset = build_demo_dataset()
    agent_cases = build_agentic_cases()
    dataset["agentic_cases"] = agent_cases["cases"]
    route_artifact = train_route_model(dataset)
    report = build_training_report(dataset)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    (DATA_DIR / "easydoc_agentic_cases.json").write_text(
        json.dumps(agent_cases, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (ARTIFACT_DIR / "easydoc_training_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    save_artifact(route_artifact)
    (ARTIFACT_DIR / "easydoc_training_readiness.json").write_text(
        json.dumps(build_training_readiness(dataset), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Agentic cases: {len(agent_cases['cases'])}")
    print(f"Training samples: {report['data_provenance']['training_samples']}")
    print(f"Validation samples: {report['data_provenance']['validation_samples']}")


if __name__ == "__main__":
    main()
