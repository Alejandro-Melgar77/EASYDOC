"""
sgdia/backend/app/models/folder.py

Schema Beanie para la colección `folders`.
Estructura jerárquica de carpetas con path materializado.
"""

from pydantic import BaseModel as PydanticBase
from pydantic import Field, field_validator
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class FolderPermission(PydanticBase):
    """Permiso de acceso a una carpeta."""

    entity_type: str = Field(..., description="'user' o 'role'")
    entity_id: str = Field(..., description="ID del usuario o rol")
    can_read: bool = Field(default=True)
    can_write: bool = Field(default=False)
    can_delete: bool = Field(default=False)
    can_share: bool = Field(default=False)
    inherit: bool = Field(
        default=True, description="Si True, los documentos dentro heredan estos permisos"
    )


class Folder(BaseDocument):
    """
    Colección: folders

    Implementa una jerarquía de carpetas con el patrón de
    'path materializado' para consultas eficientes de árbol.

    Campos:
        name        — Nombre de la carpeta (único dentro del mismo padre)
        parent_id   — ID de la carpeta padre (None = carpeta raíz)
        path        — Path materializado: '/root/subdir/subsubdir'
                      Facilita consultas de descendientes con regex o $regex
        permissions — Lista de permisos de acceso
        owner_id    — ID del usuario propietario
        depth       — Profundidad en el árbol (0 = raíz)

    Índices:
        - unique compuesto: {parent_id, name} (nombre único por carpeta padre)
        - path (para búsquedas de descendientes: $regex '^{path}')
        - owner_id
    """

    name: str = Field(..., min_length=1, max_length=255, description="Nombre de la carpeta")
    parent_id: str | None = Field(
        default=None, description="ID de la carpeta padre. None indica carpeta raíz."
    )
    path: str = Field(
        default="/",
        description="Path materializado (ej: '/documentos/contratos/2026'). "
        "Se actualiza automáticamente al mover la carpeta.",
    )
    permissions: list[FolderPermission] = Field(
        default_factory=list, description="Permisos de acceso a esta carpeta y su contenido"
    )
    owner_id: str | None = Field(
        default=None, description="ID del usuario propietario de la carpeta"
    )
    depth: int = Field(
        default=0, ge=0, description="Profundidad en el árbol de carpetas (0 = raíz)"
    )
    document_count: int = Field(
        default=0,
        ge=0,
        description="Número de documentos directamente en esta carpeta (desnormalizado)",
    )

    @field_validator("name")
    @classmethod
    def name_no_slash(cls, v: str) -> str:
        v = v.strip()
        if "/" in v or "\\" in v:
            raise ValueError("El nombre de carpeta no puede contener '/' o '\\'")
        if not v:
            raise ValueError("El nombre de carpeta no puede estar vacío")
        return v

    class Settings:
        name = "folders"
        indexes = [
            # Nombre único dentro del mismo directorio padre
            IndexModel(
                [("parent_id", ASCENDING), ("name", ASCENDING)],
                unique=True,
                name="unique_folder_name_per_parent",
            ),
            # Para buscar todos los descendientes de una carpeta: {path: {$regex: '^<path>/'}}
            IndexModel([("path", ASCENDING)]),
            IndexModel([("owner_id", ASCENDING)]),
            IndexModel([("depth", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]
