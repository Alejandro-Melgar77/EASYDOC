from typing import Any

from pydantic import BaseModel


class AgentQueryRequest(BaseModel):
    query: str
    conversation_id: str | None = None
    context_filters: dict[str, Any] | None = None


class AgentQueryResponse(BaseModel):
    response: str
    conversation_id: str
    sources: list[dict[str, Any]] = []


class AudioQueryRequest(BaseModel):
    conversation_id: str | None = None
    # the actual audio file is handled via Form/File in the router


class FeedbackRequest(BaseModel):
    rating: int  # 1 to 5
    comments: str | None = None


class EscalateRequest(BaseModel):
    reason: str
