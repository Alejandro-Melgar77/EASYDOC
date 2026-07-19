"""Beanie schema for application users."""

from datetime import datetime
from enum import Enum
from typing import Any

from beanie import Indexed
from pydantic import BaseModel as PydanticBase
from pydantic import EmailStr, Field, field_validator
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BLOCKED = "blocked"


class UserPreferences(PydanticBase):
    """Personal user preferences."""

    language: str = Field(default="es")
    theme: str = Field(default="light")
    notifications_email: bool = Field(default=True)
    notifications_push: bool = Field(default=True)
    timezone: str = Field(default="America/La_Paz")
    extra: dict[str, Any] = Field(default_factory=dict)


class User(BaseDocument):
    """User account stored in the users collection."""

    email: Indexed(EmailStr, unique=True) = Field(..., description="Unique user email")  # type: ignore[valid-type]
    name: str = Field(..., min_length=2, max_length=200)
    password_hash: str = Field(..., description="Bcrypt password hash")
    role_id: str | None = Field(default=None)
    status: UserStatus = Field(default=UserStatus.ACTIVE)
    failed_login_attempts: int = Field(default=0, ge=0)
    last_login: datetime | None = Field(default=None)
    avatar_url: str | None = Field(default=None)
    preferences: UserPreferences = Field(default_factory=UserPreferences)

    @field_validator("name")
    @classmethod
    def name_must_have_two_chars(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("role_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
            IndexModel([("_id", ASCENDING), ("created_at", ASCENDING)]),
        ]
