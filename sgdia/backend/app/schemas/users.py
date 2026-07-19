from pydantic import BaseModel, EmailStr, Field


class UpdateUserRequest(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=8)
    role_id: str | None = None
    is_active: bool | None = None
