"""
sgdia/backend/app/models/audit_log.py

Schema Beanie para la colección `audit_logs`.
Colección append-only: nunca se actualiza ni elimina un registro.
TTL index para retención de 2 años (63,072,000 segundos).
"""

from datetime import datetime
from enum import Enum
from typing import Any

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import _utcnow


class AuditResult(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"


class AuditLog(Document):
    """
    Colección: audit_logs

    ⚠️  Colección append-only — NUNCA hacer update ni delete sobre estos documentos.

    Campos:
        user_id     — ID del usuario que realizó la acción
        action      — Nombre de la acción (ej: 'document.upload', 'user.login')
        entity_type — Tipo de entidad afectada (ej: 'document', 'user', 'policy')
        entity_id   — ID de la entidad afectada
        timestamp   — Momento exacto de la acción (UTC)
        ip_address  — IP del cliente
        result      — success | failure | partial
        details     — Datos adicionales (payload diff, error, etc.)
        module      — Módulo del sistema (documents, workflows, users, etc.)

    Índices:
        - user_id + timestamp (para historial por usuario)
        - entity_type + entity_id (para historial por entidad)
        - module + action (para filtrado por módulo)
        - TTL en timestamp: 2 años de retención
        - Para paginación cursor-based: _id + timestamp
    """

    user_id: str | None = Field(
        default=None, description="ID del usuario. Null para acciones del sistema"
    )
    action: str = Field(
        ..., description="Nombre de la acción. Formato: '<entidad>.<verbo>' (ej: 'document.upload')"
    )
    entity_type: str | None = Field(
        default=None, description="Tipo de entidad afectada (ej: 'document', 'user')"
    )
    entity_id: str | None = Field(default=None, description="ID de la entidad afectada")
    timestamp: datetime = Field(default_factory=_utcnow, description="Timestamp UTC de la acción")
    ip_address: str | None = Field(
        default=None, description="Dirección IP del cliente que realizó la acción"
    )
    result: AuditResult = Field(
        default=AuditResult.SUCCESS,
        description="Resultado de la acción: success | failure | partial",
    )
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Datos adicionales: diff de campos, error message, request body, etc.",
    )
    module: str = Field(
        ..., description="Módulo del sistema (documents, workflows, users, auth, reports, etc.)"
    )

    class Settings:
        name = "audit_logs"
        indexes = [
            # Consultas por usuario con rango de fechas
            IndexModel([("user_id", ASCENDING), ("timestamp", ASCENDING)]),
            # Historial de una entidad específica
            IndexModel([("entity_type", ASCENDING), ("entity_id", ASCENDING)]),
            # Filtrado por módulo y acción
            IndexModel([("module", ASCENDING), ("action", ASCENDING)]),
            # Filtrado por resultado
            IndexModel([("result", ASCENDING)]),
            # TTL — retención de 2 años (63,072,000 segundos)
            IndexModel(
                [("timestamp", ASCENDING)], expireAfterSeconds=63_072_000, name="ttl_2_years"
            ),
            # Para paginación cursor-based: < 2s (objetivo del plan)
            IndexModel([("_id", ASCENDING), ("timestamp", ASCENDING)]),
        ]

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
