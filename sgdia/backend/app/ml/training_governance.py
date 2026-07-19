"""Readiness checks that prevent synthetic data from enabling automation."""

from __future__ import annotations

from collections import Counter
from typing import Any

MIN_REAL_COMPLETED_WORKFLOWS = 200


def build_training_readiness(dataset: dict[str, Any]) -> dict[str, Any]:
    """Describe whether a dataset is eligible for a supervised operational model.

    A positive result is intentionally conservative.  It requires real,
    anonymised completed workflows and human-approved labels; synthetic files
    remain useful for integration tests but never activate assignment or route
    automation.
    """
    workflows = dataset.get("workflow_instances", [])
    events = dataset.get("workflow_events", [])
    synthetic_workflows = sum(bool(item.get("is_synthetic", True)) for item in workflows)
    real_completed = sum(
        not bool(item.get("is_synthetic", True))
        and str(item.get("status", "")).lower() in {"completed", "terminado"}
        for item in workflows
    )
    policies = sorted(
        {str(item.get("policy_code", "")) for item in workflows if item.get("policy_code")}
    )
    event_fields = Counter(
        field
        for event in events
        for field in (
            "workflow_id",
            "policy_code",
            "stage",
            "started_at",
            "finished_at",
            "duration_days",
        )
        if event.get(field) not in (None, "")
    )
    missing_event_fields = [
        field
        for field in (
            "workflow_id",
            "policy_code",
            "stage",
            "started_at",
            "finished_at",
            "duration_days",
        )
        if event_fields[field] < len(events)
    ]
    ready = real_completed >= MIN_REAL_COMPLETED_WORKFLOWS and not missing_event_fields
    return {
        "engine": "easydoc_training_governance_v1",
        "decision": "ready_for_human_review" if ready else "blocked",
        "automation_enabled": False,
        "real_completed_workflows": real_completed,
        "synthetic_workflows": synthetic_workflows,
        "minimum_real_completed_workflows": MIN_REAL_COMPLETED_WORKFLOWS,
        "policies_observed": policies,
        "missing_event_fields": missing_event_fields,
        "requirements": [
            "Anonimizar y aprobar los eventos reales antes del entrenamiento.",
            "Revisar sesgo por politica, departamento y periodo academico.",
            "Comparar la nueva version contra la linea base y aprobarla manualmente.",
            "Mantener las recomendaciones sin ejecucion automatica hasta la aprobacion operativa.",
        ],
        "data_is_synthetic_only": synthetic_workflows == len(workflows),
    }
