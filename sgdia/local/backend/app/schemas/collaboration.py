from typing import Any

from pydantic import BaseModel


class SessionCreate(BaseModel):
    document_id: str


class CommentCreate(BaseModel):
    text: str
    position: dict[str, Any] | None = None


class CommentResponse(BaseModel):
    id: str
    document_id: str
    user_id: str
    text: str
    position: dict[str, Any] | None
    created_at: float
    resolved: bool
