"""
sgdia/backend/app/models/comment.py

Schema Beanie para la colección `comments`.
Permite comentarios anidados en documentos colaborativos.
"""

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class Comment(BaseDocument):
    """
    Colección: comments

    Campos:
        document_id      — ID del documento al que pertenece el comentario
        user_id          — ID del autor del comentario
        content          — Texto del comentario
        selection_range  — Rango de texto seleccionado (p. ej. "10-45")
        resolved         — Si el comentario está marcado como resuelto
        parent_comment_id— ID del comentario padre para respuestas (nullable)
    """

    document_id: str = Field(..., description="ID del documento asociado")
    user_id: str = Field(..., description="ID del usuario autor")
    content: str = Field(..., description="Texto del comentario")
    selection_range: str | None = Field(
        default=None, description="Rango de selección en el documento (p.ej. '15-30')"
    )
    resolved: bool = Field(default=False)
    parent_comment_id: str | None = Field(
        default=None, description="ID del comentario padre para respuestas en hilo"
    )

    class Settings:
        name = "comments"
        indexes = [
            IndexModel([("document_id", ASCENDING)]),
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("parent_comment_id", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]
