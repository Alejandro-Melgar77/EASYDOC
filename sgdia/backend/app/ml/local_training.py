"""Local/offline training utilities for EASYDOC.

This module keeps the prototype honest: it does not claim a cloud model. It
trains a compact statistical artifact from local JSON data, suitable for route
prediction, bottleneck risk and resource prioritization demos. The artifact can
later be replaced by TensorFlow/Scikit-learn while preserving the JSON contract.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from statistics import mean
from typing import Any

ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "easydoc_route_model.json"


@dataclass(frozen=True)
class StageProfile:
    name: str
    avg_days: float
    bottleneck_risk: float
    common_department: str | None
    common_worker: str | None


@dataclass(frozen=True)
class PolicyProfile:
    policy_code: str
    policy_name: str
    route: list[StageProfile]
    avg_total_days: float
    overdue_rate: float
    anomaly_rate: float
    recommended_priority: str


@dataclass(frozen=True)
class RouteTrainingArtifact:
    product: str
    model_name: str
    model_type: str
    trained_at: str
    period: dict[str, str]
    sample_count: int
    policies: dict[str, PolicyProfile]
    resource_load: dict[str, float]


def train_route_model(dataset: dict[str, Any]) -> RouteTrainingArtifact:
    """Train a compact route model from generated or seeded workflow data."""

    workflows = dataset["workflow_instances"]
    events = dataset["workflow_events"]
    events_by_policy: dict[str, list[dict[str, Any]]] = defaultdict(list)
    workflows_by_policy: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for event in events:
        events_by_policy[event["policy_code"]].append(event)
    for workflow in workflows:
        workflows_by_policy[workflow["policy_code"]].append(workflow)

    policy_names = {
        policy["code"]: policy["name"] for policy in dataset.get("business_policies", [])
    }
    profiles: dict[str, PolicyProfile] = {}
    for policy_code, policy_workflows in workflows_by_policy.items():
        policy_events = events_by_policy[policy_code]
        route_names = _ordered_route(policy_events)
        stage_profiles = [
            _stage_profile(stage, [event for event in policy_events if event["stage"] == stage])
            for stage in route_names
        ]
        overdue_rate = _rate(policy_workflows, "is_overdue")
        anomaly_rate = _rate(policy_workflows, "has_anomaly")
        profiles[policy_code] = PolicyProfile(
            policy_code=policy_code,
            policy_name=policy_names.get(policy_code, policy_code),
            route=stage_profiles,
            avg_total_days=round(mean(float(item["actual_days"]) for item in policy_workflows), 2),
            overdue_rate=round(overdue_rate, 3),
            anomaly_rate=round(anomaly_rate, 3),
            recommended_priority=_recommended_priority(overdue_rate, anomaly_rate),
        )

    return RouteTrainingArtifact(
        product="EASYDOC",
        model_name="easydoc_local_route_risk_v1",
        model_type="offline_statistical_baseline",
        trained_at=datetime.now(UTC).isoformat(),
        period=dataset["period"],
        sample_count=len(workflows),
        policies=profiles,
        resource_load=_resource_load(events),
    )


def save_artifact(artifact: RouteTrainingArtifact, path: Path = ARTIFACT_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(_artifact_to_json(artifact), indent=2, ensure_ascii=False), encoding="utf-8"
    )


def load_artifact(path: Path = ARTIFACT_PATH) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def predict_policy_route(
    policy_code: str, artifact: dict[str, Any] | None = None
) -> dict[str, Any] | None:
    source = artifact if artifact is not None else load_artifact()
    if not source:
        return None
    policies = source.get("policies", {})
    return policies.get(policy_code.upper())


def _ordered_route(events: list[dict[str, Any]]) -> list[str]:
    stage_positions: dict[str, list[int]] = defaultdict(list)
    for event in events:
        workflow_events = [item for item in events if item["workflow_id"] == event["workflow_id"]]
        route = [
            item["stage"] for item in sorted(workflow_events, key=lambda item: item["started_at"])
        ]
        stage_positions[event["stage"]].append(route.index(event["stage"]))
    return [
        stage
        for stage, _ in sorted(
            stage_positions.items(),
            key=lambda item: mean(item[1]),
        )
    ]


def _stage_profile(stage: str, events: list[dict[str, Any]]) -> StageProfile:
    durations = [float(event["duration_days"]) for event in events]
    department = _most_common([event.get("department") for event in events])
    worker = _most_common([event.get("worker_name") for event in events])
    avg_days = mean(durations) if durations else 1.0
    risk = min(avg_days / 2.5, 1.0)
    return StageProfile(
        name=stage,
        avg_days=round(avg_days, 2),
        bottleneck_risk=round(risk, 3),
        common_department=department,
        common_worker=worker,
    )


def _rate(items: list[dict[str, Any]], key: str) -> float:
    if not items:
        return 0.0
    return sum(1 for item in items if item.get(key)) / len(items)


def _recommended_priority(overdue_rate: float, anomaly_rate: float) -> str:
    if overdue_rate >= 0.45 or anomaly_rate >= 0.22:
        return "alta"
    if overdue_rate >= 0.25 or anomaly_rate >= 0.12:
        return "media"
    return "normal"


def _resource_load(events: list[dict[str, Any]]) -> dict[str, float]:
    duration_by_worker: dict[str, float] = defaultdict(float)
    for event in events:
        duration_by_worker[event["worker_name"]] += float(event["duration_days"])
    if not duration_by_worker:
        return {}
    max_load = max(duration_by_worker.values())
    return {
        worker: round((duration / max_load) * 100, 2)
        for worker, duration in sorted(duration_by_worker.items())
    }


def _most_common(values: list[str | None]) -> str | None:
    cleaned = [value for value in values if value]
    if not cleaned:
        return None
    return Counter(cleaned).most_common(1)[0][0]


def _artifact_to_json(artifact: RouteTrainingArtifact) -> dict[str, Any]:
    data = asdict(artifact)
    data["policies"] = {code: asdict(profile) for code, profile in artifact.policies.items()}
    return data
