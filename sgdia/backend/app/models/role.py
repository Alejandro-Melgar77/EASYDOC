"""Beanie schema for roles and module permissions."""

from enum import Enum

from beanie import Indexed
from pydantic import BaseModel as PydanticBase
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class Action(str, Enum):
    """Supported permission actions."""

    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    APPROVE = "approve"
    ADMIN = "admin"


class ModulePermission(PydanticBase):
    """Permissions assigned to one functional module."""

    module: str = Field(..., description="Module name, for example documents or workflows")
    actions: list[Action] = Field(default_factory=list, description="Allowed actions")


class Role(BaseDocument):
    """System role stored in the roles collection."""

    name: Indexed(str, unique=True) = Field(  # type: ignore[valid-type]
        ..., min_length=2, max_length=100, description="Unique role name"
    )
    description: str | None = Field(default=None, max_length=500)
    permissions: list[ModulePermission] = Field(default_factory=list)

    class Settings:
        name = "roles"
        indexes = [
            IndexModel([("name", ASCENDING)], unique=True),
            IndexModel([("is_deleted", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
        ]
