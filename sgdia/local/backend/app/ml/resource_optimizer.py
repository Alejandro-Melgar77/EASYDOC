"""Explainable, non-automatic workload prioritisation."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from app.ml.local_training import load_artifact
from app.schemas.predictions import ResourceItem, ResourceResponse

logger = logging.getLogger(__name__)

_W_PRIORITY = 0.50
_W_AGE = 0.30
_W_TYPE = 0.20
_TYPE_SCORES = {
    "casos_especiales": 1.0,
    "beca_auxiliar": 0.95,
    "homologacion": 0.9,
    "retiro_materia": 0.82,
    "certificado_notas": 0.72,
    "contract": 1.0,
    "invoice": 0.9,
    "policy": 0.8,
    "report": 0.6,
    "default": 0.5,
}


class ResourceOptimizer:
    """Order work and propose the lowest observed-load eligible assignee."""

    async def optimize(
        self, items: list[dict[str, Any]], available_resources: int | None = None
    ) -> ResourceResponse:
        if not items:
            return ResourceResponse(
                prioritized_items=[], optimization_score=1.0, generated_at=datetime.now(UTC)
            )

        now = datetime.now(UTC)
        load_profile = (load_artifact() or {}).get("resource_load", {})
        scored = sorted(
            ((_priority_score(item, now), item) for item in items),
            key=lambda entry: (-entry[0], str(entry[1].get("id", ""))),
        )
        result_items = [
            _resource_item(item, score, rank, load_profile)
            for rank, (score, item) in enumerate(scored, start=1)
        ]
        if available_resources is not None and available_resources < len(result_items):
            result_items = result_items[: max(available_resources, 0)]
        optimization_score = round(
            sum(item.priority_score for item in result_items) / max(len(result_items), 1), 4
        )
        logger.info("Resource recommendations generated for %d queued items", len(result_items))
        return ResourceResponse(
            prioritized_items=result_items,
            optimization_score=optimization_score,
            generated_at=now,
        )


def _priority_score(item: dict[str, Any], now: datetime) -> float:
    urgency = min(max(float(item.get("priority_hint", 0.5)), 0.0), 1.0)
    created_at = _parse_datetime(item.get("created_at"))
    age_days = (now - created_at).total_seconds() / 86400 if created_at else 1.0
    age = min(max(age_days, 0.0) / 30.0, 1.0)
    type_score = _TYPE_SCORES.get(str(item.get("type", "default")).lower(), _TYPE_SCORES["default"])
    return _W_PRIORITY * urgency + _W_AGE * age + _W_TYPE * type_score


def _resource_item(
    item: dict[str, Any], score: float, rank: int, load_profile: dict[str, Any]
) -> ResourceItem:
    eligible = [str(value) for value in item.get("eligible_assignees", []) if str(value)]
    candidates = eligible or sorted(str(worker) for worker in load_profile)
    assignee = (
        min(candidates, key=lambda worker: (float(load_profile.get(worker, 100.0)), worker))
        if candidates
        else None
    )
    reason = (
        f"Prioridad explicable #{rank}: urgencia={item.get('priority_hint', 0.5)}, "
        f"tipo={item.get('type', 'default')}."
    )
    if assignee:
        reason += f" Sugerencia no automatica: {assignee} tiene la menor carga observada ({load_profile.get(assignee, 100.0)}%)."
    else:
        reason += " No hay perfil de carga local para sugerir responsable."
    return ResourceItem(
        item_id=str(item.get("id", f"item_{rank}")),
        priority_score=round(score, 4),
        recommended_assignee=assignee,
        suggested_deadline=_parse_datetime(item.get("deadline")),
        reasoning=reason,
    )


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
