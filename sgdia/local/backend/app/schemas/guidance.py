"""Public, offline guidance contracts for academic service discovery."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PublicGuidanceRequest(BaseModel):
    """Natural-language description supplied by a guest student."""

    query: str = Field(min_length=8, max_length=1_500)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        return " ".join(value.split())


class GuidanceRequirement(BaseModel):
    id: str
    label: str
    required: bool


class PublicGuidanceResponse(BaseModel):
    """Explainable routing recommendation from the local policy advisor."""

    outcome: Literal["recommended", "clarify"]
    message: str
    confidence: float = Field(ge=0, le=1)
    policy_id: str | None = None
    policy_title: str | None = None
    rationale: list[str] = Field(default_factory=list)
    requirements: list[GuidanceRequirement] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)
    source: Literal["local_policy_corpus"] = "local_policy_corpus"
