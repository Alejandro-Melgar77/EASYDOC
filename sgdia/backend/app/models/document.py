"""Beanie schema for documents, metadata, text search, and ACLs."""

from enum import Enum
from typing import Any

from pydantic import BaseModel as PydanticBase
from pydantic import Field, field_validator
from pymongo import ASCENDING, TEXT, IndexModel

from .base import BaseDocument


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class DocumentPermission(PydanticBase):
    """Document access rule for a user or role."""

    entity_type: str = Field(..., description="user or role")
    entity_id: str = Field(..., description="User or role id")
    can_read: bool = Field(default=True)
    can_write: bool = Field(default=False)
    can_delete: bool = Field(default=False)
    can_share: bool = Field(default=False)


class Document(BaseDocument):
    """Document stored in the documents collection."""

    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    file_type: str = Field(..., description="Extension: pdf, docx, xlsx, pptx, etc.")
    s3_key: str = Field(..., description="S3/MinIO object key")
    s3_bucket: str = Field(default="sgdia-documents")
    folder_id: str | None = Field(default=None)
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    size_bytes: int = Field(default=0, ge=0)
    mime_type: str = Field(default="application/octet-stream")
    extracted_text: str | None = Field(default=None)
    embedding_vector: list[float] | None = Field(default=None)
    current_version: int = Field(default=1, ge=1)
    permissions: list[DocumentPermission] = Field(default_factory=list)
    status: DocumentStatus = Field(default=DocumentStatus.DRAFT)

    @field_validator("embedding_vector")
    @classmethod
    def embedding_must_have_1536_dimensions(cls, value: list[float] | None) -> list[float] | None:
        if value is not None and len(value) != 1536:
            raise ValueError("El embedding debe tener exactamente 1536 dimensiones")
        return value

    class Settings:
        name = "documents"
        indexes = [
            IndexModel(
                [("title", TEXT), ("description", TEXT), ("extracted_text", TEXT)],
                name="documents_text_search",
                weights={"title": 10, "description": 5, "extracted_text": 1},
                default_language="spanish",
            ),
            IndexModel([("folder_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("tags", ASCENDING)]),
            IndexModel([("file_type", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
            IndexModel([("_id", ASCENDING), ("created_at", ASCENDING)]),
            IndexModel([("folder_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("folder_id", ASCENDING), ("created_at", ASCENDING)]),
        ]
