"""
sgdia/backend/app/models/workflow_task.py

Schema Beanie para la colección `workflow_tasks`.
Representa una tarea dentro de una instancia de workflow.
"""

from datetime import datetime
from enum import Enum

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"


class WorkflowTask(BaseDocument):
    """
    Colección: workflow_tasks

    Campos:
        workflow_id   — ID de la instancia de workflow
        node_id       — ID del nodo del diagrama al que pertenece
        assigned_to   — ID del usuario asignado (nullable)
        status        — pending | in_progress | done | blocked
        due_date      — Fecha límite (nullable)
        completed_at  — Timestamp de finalización (nullable)
    """

    workflow_id: str = Field(..., description="ID de la instancia de workflow")
    node_id: str = Field(..., description="ID del nodo del diagrama")
    assigned_to: str | None = Field(default=None)
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    due_date: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)

    class Settings:
        name = "workflow_tasks"
        indexes = [
            IndexModel([("workflow_id", ASCENDING)]),
            IndexModel([("node_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
        ]
