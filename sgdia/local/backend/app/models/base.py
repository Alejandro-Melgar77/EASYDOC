"""
sgdia/backend/app/models/base.py

Clase base para todos los documentos Beanie (ODM para MongoDB).
Provee campos comunes: id, created_at, updated_at, created_by, is_deleted (soft delete).
"""

from datetime import UTC, datetime

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


def _utcnow() -> datetime:
    """Retorna el timestamp actual en UTC (timezone-aware)."""
    return datetime.now(tz=UTC)


class BaseDocument(Document):
    """
    Documento Beanie base para todos los modelos de SGDIA.

    Campos:
        created_at  — Timestamp de creación (UTC, auto)
        updated_at  — Timestamp de última modificación (UTC, auto)
        created_by  — ID del usuario que creó el registro (ObjectId como string)
        is_deleted  — Soft delete: True = registro eliminado lógicamente

    Uso:
        class User(BaseDocument):
            email: str
            ...

            class Settings:
                name = "users"
    """

    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    created_by: str | None = Field(default=None, description="ID del usuario que creó el registro")
    is_deleted: bool = Field(
        default=False,
        description="Soft delete: el registro existe pero está marcado como eliminado",
    )

    class Settings:
        # Subclases deben definir name = "collection_name"
        use_state_management = True
        # Índice base para filtrar documentos no eliminados (más eficiente con compound indexes en subclases)
        indexes = [
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]

    async def soft_delete(self, deleted_by: str | None = None) -> None:
        """Marca el documento como eliminado (soft delete)."""
        self.is_deleted = True
        self.updated_at = _utcnow()
        if deleted_by:
            # Se puede extender para guardar quién eliminó
            pass
        await self.save()

    async def touch(self) -> None:
        """Actualiza updated_at al momento actual."""
        self.updated_at = _utcnow()
        await self.save()

    def to_response_dict(self) -> dict:
        """
        Serializa el documento excluyendo campos internos de soft delete.
        Útil para respuestas de la API.
        """
        data = self.model_dump(by_alias=True)
        data.pop("is_deleted", None)
        return data

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}
