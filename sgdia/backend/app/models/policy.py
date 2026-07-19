"""Beanie model for persisted EASYDOC business policies."""

from enum import Enum

from pydantic import Field, field_validator
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class PolicyStatus(str, Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Policy(BaseDocument):
    """Collection model mirroring policies written by the FastAPI service."""

    # name/current_version remain to read older development fixtures safely.
    name: str | None = Field(default=None, description="Legacy policy name")
    title: str | None = Field(default=None, description="Visible policy title")
    description: str | None = Field(default=None)
    diagram_data: dict = Field(default_factory=dict, description="UML diagram JSON")
    form_definition: dict = Field(
        default_factory=lambda: {"questions": [], "attachments": []},
        description="Dynamic form definition",
    )
    status: PolicyStatus = Field(default=PolicyStatus.DRAFT)
    current_version: int = Field(default=1, ge=1)
    version: int = Field(default=1, ge=1)
    approver_id: str | None = Field(default=None)
    published_at: str | None = Field(default=None)
    embedding_vector: list[float] | None = Field(
        default=None, description="Vector for Atlas Vector Search (dim 1536)"
    )
    tags: list[str] = Field(default_factory=list)

    @field_validator("embedding_vector")
    @classmethod
    def embedding_must_have_1536_dimensions(cls, value: list[float] | None) -> list[float] | None:
        if value is not None and len(value) != 1536:
            raise ValueError("El embedding debe tener exactamente 1536 dimensiones")
        return value

    class Settings:
        name = "policies"
        indexes = [
            IndexModel(
                [("title", ASCENDING)],
                unique=True,
                partialFilterExpression={"title": {"$type": "string"}},
                name="unique_policy_title",
            ),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("updated_at", ASCENDING)]),
        ]
