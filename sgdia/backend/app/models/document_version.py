"""
sgdia/backend/app/models/document_version.py

Schema Beanie para la colección `document_versions`.
Almacena cada versión de un documento (historial de cambios).
"""

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class DocumentVersion(BaseDocument):
    """
    Colección: document_versions

    Campos:
        document_id    — ID del documento padre
        version_number — Número de versión (incrementa con cada cambio)
        s3_key         — Key S3 del archivo de esta versión específica
        size_bytes     — Tamaño del archivo en bytes
        change_summary — Descripción del cambio realizado
        created_by     — ID del usuario que creó esta versión

    Índices:
        - unique compuesto: {document_id, version_number}
        - document_id solo (para listar versiones de un documento)
    """

    document_id: str = Field(
        ..., description="ID del documento padre (referencia a colección documents)"
    )
    version_number: int = Field(
        ..., ge=1, description="Número de versión. Empieza en 1 e incrementa con cada cambio."
    )
    s3_key: str = Field(
        ...,
        description="Key S3/MinIO del archivo de esta versión. "
        "Formato: {org_id}/documents/{year}/{month}/{file_id}_v{version_number}",
    )
    s3_bucket: str = Field(
        default="sgdia-documents", description="Bucket S3/MinIO donde está almacenada esta versión"
    )
    size_bytes: int = Field(default=0, ge=0, description="Tamaño del archivo en bytes")
    change_summary: str | None = Field(
        default=None,
        max_length=1000,
        description="Descripción breve del cambio realizado en esta versión",
    )

    class Settings:
        name = "document_versions"
        indexes = [
            # Unique: no puede haber dos versiones iguales del mismo documento
            IndexModel(
                [("document_id", ASCENDING), ("version_number", ASCENDING)],
                unique=True,
                name="unique_document_version",
            ),
            # Para listar versiones de un documento (más reciente primero)
            IndexModel([("document_id", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]
