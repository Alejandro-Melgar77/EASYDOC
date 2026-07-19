from datetime import datetime

from pydantic import BaseModel


class Permission(BaseModel):
    module: str
    actions: list[str]


class CreateRoleRequest(BaseModel):
    name: str
    description: str
    permissions: list[Permission]


class UpdateRoleRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[Permission] | None = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: list[Permission]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    roles: list[RoleResponse]
    total: int
