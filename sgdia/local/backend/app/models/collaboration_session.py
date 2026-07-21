"""
sgdia/backend/app/models/collaboration_session.py

Schema Beanie para la colección `collaboration_sessions`.
Representa una sesión de edición colaborativa en tiempo real.
"""

from datetime import datetime
from enum import Enum

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class SessionStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    PAUSED = "paused"


class CollaborationSession(BaseDocument):
    """
    Colección: collaboration_sessions

    Campos:
        document_id          — ID del documento colaborado
        active_users         — Lista de IDs de usuarios conectados
        status               — active | closed | paused
        started_at           — Timestamp de inicio
        closed_at            — Timestamp de cierre (nullable)
        onlyoffice_key      — Clave de integración con OnlyOffice (opcional)
    """

    document_id: str = Field(..., description="ID del documento asociado")
    active_users: list[str] = Field(
        default_factory=list, description="IDs de usuarios actualmente activos"
    )
    status: SessionStatus = Field(default=SessionStatus.ACTIVE)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: datetime | None = Field(default=None)
    onlyoffice_key: str | None = Field(default=None)

    class Settings:
        name = "collaboration_sessions"
        indexes = [
            IndexModel([("document_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("started_at", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
        ]
