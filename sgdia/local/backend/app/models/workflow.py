"""
sgdia/backend/app/models/workflow.py

Schema Beanie para la colección `workflow_instances`.
Representa una instancia de workflow basada en una política.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class WorkflowStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class WorkflowInstance(BaseDocument):
    """
    Colección: workflow_instances

    Campos:
        policy_id       — ID de la política que define el diagrama
        current_node_id — ID del nodo activo del workflow
        status          — active | completed | paused | cancelled
        history         — Lista de eventos (timestamp, node_id, action)
        variables       — Diccionario de variables de ejecución
        started_by      — ID del usuario que inició el workflow
        started_at      — Timestamp de inicio
        completed_at    — Timestamp de finalización (nullable)
    """

    policy_id: str = Field(..., description="ID de la política asociada")
    current_node_id: str | None = Field(default=None, description="Nodo activo actual")
    status: WorkflowStatus = Field(default=WorkflowStatus.ACTIVE)
    history: list[dict[str, Any]] = Field(
        default_factory=list, description="Registro de cambios de estado"
    )
    variables: dict[str, Any] = Field(default_factory=dict)
    started_by: str = Field(..., description="Usuario que inició la instancia")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = Field(default=None)

    class Settings:
        name = "workflow_instances"
        indexes = [
            IndexModel([("policy_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("started_at", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
        ]
