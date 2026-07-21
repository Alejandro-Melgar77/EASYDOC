"""Explainable bottleneck detection over active workflow timestamps."""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import UTC, datetime
from statistics import mean
from typing import Any

from app.core.database import get_database
from app.schemas.predictions import BottleneckItem, BottleneckResponse

logger = logging.getLogger(__name__)

_SEVERITY_THRESHOLDS = (("critical", 7.0), ("high", 4.0), ("medium", 2.0), ("low", 0.0))


def _severity(avg_days: float) -> str:
    return next(level for level, threshold in _SEVERITY_THRESHOLDS if avg_days >= threshold)


class BottleneckDetector:
    """Detect queues from real active-node entry times, never from demo estimates."""

    async def detect(self, lookback_days: int = 30) -> BottleneckResponse:
        del lookback_days  # Active queues are evaluated from their actual entry time.
        now = datetime.now(UTC)
        db = get_database()
        cursor = db["workflow_instances"].find({"status": {"$in": ["in_progress", "en_curso"]}})
        waits_by_node: dict[str, list[float]] = defaultdict(list)

        async for instance in cursor:
            node_id = str(instance.get("current_node_id") or "unknown")
            entered_at = _current_node_entered_at(instance)
            if entered_at is None:
                logger.debug(
                    "Workflow %s skipped: active-node timestamp unavailable", instance.get("_id")
                )
                continue
            wait_days = max(0.0, (now - entered_at).total_seconds() / 86400)
            waits_by_node[node_id].append(wait_days)

        bottlenecks = [
            BottleneckItem(
                node_id=node_id,
                node_name=node_id.replace("_", " ").title(),
                avg_wait_days=round(mean(waits), 2),
                pending_items=len(waits),
                severity=_severity(mean(waits)),
            )
            for node_id, waits in waits_by_node.items()
        ]
        order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        bottlenecks.sort(key=lambda item: (order[item.severity], -item.pending_items))
        logger.info("Bottleneck analysis completed with %d observed queues", len(bottlenecks))
        return BottleneckResponse(bottlenecks=bottlenecks, analyzed_at=now)


def _current_node_entered_at(instance: dict[str, Any]) -> datetime | None:
    current_node = instance.get("current_node_id")
    history = instance.get("history", [])
    for event in reversed(history if isinstance(history, list) else []):
        if event.get("node_id") == current_node:
            timestamp = _parse_datetime(event.get("timestamp"))
            if timestamp is not None:
                return timestamp
    return (
        _parse_datetime(instance.get("current_node_entered_at"))
        or _parse_datetime(instance.get("started_at"))
        or _parse_datetime(instance.get("created_at"))
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
