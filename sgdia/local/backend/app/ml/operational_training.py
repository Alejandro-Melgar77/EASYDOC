"""Offline training evaluation and workload snapshots for EASYDOC."""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from statistics import mean
from typing import Any

from app.ml.local_training import train_route_model
from app.ml.semantic_retriever import LocalSemanticRetriever
from app.ml.training_governance import build_training_readiness


def build_training_report(dataset: dict[str, Any]) -> dict[str, Any]:
    """Evaluate a March-June baseline against July without external dependencies."""
    training, validation = _chronological_split(dataset)
    artifact = train_route_model(training)
    validation_workflows = validation["workflow_instances"]
    validation_events = validation["workflow_events"]
    per_policy: list[dict[str, Any]] = []

    for code, profile in artifact.policies.items():
        rows = [item for item in validation_workflows if item["policy_code"] == code]
        if not rows:
            continue
        actual_average = mean(float(item["actual_days"]) for item in rows)
        mae = abs(profile.avg_total_days - actual_average)
        actual_route = _route_for_policy(validation_events, code)
        predicted_route = [stage.name for stage in profile.route]
        per_policy.append(
            {
                "policy_code": code,
                "policy_name": profile.policy_name,
                "validation_samples": len(rows),
                "route_match": predicted_route == actual_route,
                "duration_mae_days": round(mae, 3),
                "predicted_priority": profile.recommended_priority,
                "observed_overdue_rate": round(
                    sum(bool(item["is_overdue"]) for item in rows) / len(rows), 3
                ),
            }
        )

    route_match_rate = (
        sum(bool(item["route_match"]) for item in per_policy) / len(per_policy)
        if per_policy
        else 0.0
    )
    duration_mae = (
        mean(float(item["duration_mae_days"]) for item in per_policy) if per_policy else 0.0
    )
    return {
        "product": "EASYDOC",
        "report_type": "offline_baseline_evaluation",
        "model_name": artifact.model_name,
        "model_type": artifact.model_type,
        "generated_at": datetime.now(UTC).isoformat(),
        "training_period": training["period"],
        "validation_period": validation["period"],
        "data_provenance": {
            "is_synthetic": True,
            "training_samples": len(training["workflow_instances"]),
            "validation_samples": len(validation_workflows),
            "note": "Synthetic baseline only. It must not be presented as institutional performance.",
        },
        "metrics": {
            "route_match_rate": round(route_match_rate, 3),
            "duration_mae_days": round(duration_mae, 3),
            "policies_evaluated": len(per_policy),
            "guidance_match_rate": _guidance_match_rate(dataset),
        },
        "per_policy": per_policy,
        "operational_snapshot": build_operational_snapshot(dataset),
        "training_readiness": build_training_readiness(dataset),
    }


def build_operational_snapshot(dataset: dict[str, Any]) -> dict[str, Any]:
    """Aggregate workload indicators by department and pseudonymous worker key."""
    events = dataset["workflow_events"]
    by_department: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_worker: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        by_department[event["department"]].append(event)
        by_worker[event["worker_id"]].append(event)

    departments = [
        {
            "department": name,
            "events": len(rows),
            "avg_duration_days": round(mean(float(row["duration_days"]) for row in rows), 3),
            "observed_events": sum(row["status"] == "observado" for row in rows),
        }
        for name, rows in sorted(by_department.items())
    ]
    workers = [
        {
            "worker_key": f"worker-{worker_id[-3:]}",
            "department": rows[0]["department"],
            "events": len(rows),
            "load_days": round(sum(float(row["duration_days"]) for row in rows), 2),
        }
        for worker_id, rows in sorted(by_worker.items())
    ]
    return {"departments": departments, "workers": workers, "is_synthetic": True}


def _chronological_split(dataset: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    train_workflows = [
        item for item in dataset["workflow_instances"] if _month(item["created_at"]) < 7
    ]
    validation_workflows = [
        item for item in dataset["workflow_instances"] if _month(item["created_at"]) == 7
    ]
    training_ids = {item["id"] for item in train_workflows}
    validation_ids = {item["id"] for item in validation_workflows}
    train_events = [
        item for item in dataset["workflow_events"] if item["workflow_id"] in training_ids
    ]
    validation_events = [
        item for item in dataset["workflow_events"] if item["workflow_id"] in validation_ids
    ]
    shared = {
        key: value
        for key, value in dataset.items()
        if key not in {"workflow_instances", "workflow_events", "period"}
    }
    return (
        {
            **shared,
            "workflow_instances": train_workflows,
            "workflow_events": train_events,
            "period": {"from": "2026-03-01", "to": "2026-06-30"},
        },
        {
            **shared,
            "workflow_instances": validation_workflows,
            "workflow_events": validation_events,
            "period": {"from": "2026-07-01", "to": "2026-07-31"},
        },
    )


def _route_for_policy(events: list[dict[str, Any]], policy_code: str) -> list[str]:
    candidates = [item for item in events if item["policy_code"] == policy_code]
    if not candidates:
        return []
    one_workflow = candidates[0]["workflow_id"]
    return [
        item["stage"]
        for item in sorted(
            (item for item in candidates if item["workflow_id"] == one_workflow),
            key=lambda item: item["started_at"],
        )
    ]


def _month(value: str) -> int:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC).month


def _guidance_match_rate(dataset: dict[str, Any]) -> float:
    """Validate local semantic guidance against the versioned synthetic corpus."""
    cases = dataset.get("agentic_cases", [])
    if not cases:
        return 0.0
    retriever = LocalSemanticRetriever.from_agentic_cases(cases)
    correct = 0
    for case in cases:
        predicted = retriever.policy_scores(str(case.get("student_message", "")))
        if predicted and max(predicted, key=predicted.get) == case.get("policy_code"):
            correct += 1
    return round(correct / len(cases), 3)
