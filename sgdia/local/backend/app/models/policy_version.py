"""Beanie model for immutable policy snapshots."""

from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class PolicyVersion(BaseDocument):
    """History entry that captures both diagram and dynamic form state."""

    policy_id: str = Field(..., description="Parent policy ID")
    version: int = Field(..., ge=1, description="Incremental policy version")
    title: str = Field(...)
    description: str | None = Field(default=None)
    diagram_data: dict = Field(default_factory=dict)
    form_definition: dict = Field(default_factory=lambda: {"questions": [], "attachments": []})
    status: str = Field(default="draft")
    change_summary: str = Field(default="")
    created_by: str | None = Field(default=None)

    class Settings:
        name = "policy_versions"
        indexes = [
            IndexModel(
                [("policy_id", ASCENDING), ("version", ASCENDING)],
                unique=True,
                name="unique_policy_version",
            ),
            IndexModel([("policy_id", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]
