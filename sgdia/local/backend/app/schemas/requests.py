"""Contracts for public academic requests and staff task handling."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.document_intelligence import DocumentIntelligenceResult

RequestStatus = Literal[
    "received",
    "in_progress",
    "observed",
    "awaiting_approval",
    "approved",
    "rejected",
    "discarded",
    "completed",
]
TaskStatus = Literal[
    "received",
    "in_progress",
    "observed",
    "approved",
    "rejected",
    "discarded",
    "completed",
]


class PublicServiceSummary(BaseModel):
    """Published policy that a guest may use as an academic service."""

    id: str
    title: str
    description: str | None = None
    form_definition: dict[str, Any]


class PublicServiceListResponse(BaseModel):
    services: list[PublicServiceSummary]


class GuestApplicant(BaseModel):
    """Minimum identifying information supplied without a user account."""

    full_name: str = Field(min_length=3, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    university_id: str | None = Field(default=None, max_length=80)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return " ".join(value.split())


class GuestRequestCreate(BaseModel):
    applicant: GuestApplicant
    answers: dict[str, Any] = Field(default_factory=dict)
    priority: Literal["normal", "high"] = "normal"


class AttachmentResponse(BaseModel):
    id: str
    requirement_id: str
    filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime
    intelligence: DocumentIntelligenceResult | None = None


class RequestTimelineEntry(BaseModel):
    at: datetime
    status: RequestStatus
    detail: str
    actor_id: str | None = None


class GuestRequestReceipt(BaseModel):
    tracking_code: str
    receipt_pin: str
    status: RequestStatus
    current_stage: str | None = None


class RequestTrackingResponse(BaseModel):
    tracking_code: str
    service_title: str
    status: RequestStatus
    current_stage: str | None = None
    current_department: str | None = None
    active_stages: list[dict[str, str | None]] = Field(default_factory=list)
    is_fully_completed: bool = False
    final_response: str | None = None
    final_response_published_at: datetime | None = None
    final_response_pending_approval: bool = False
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentResponse]
    timeline: list[RequestTimelineEntry]


class StaffTaskResponse(BaseModel):
    id: str
    request_id: str
    tracking_code: str
    service_title: str
    node_id: str
    title: str
    department: str | None = None
    status: TaskStatus
    priority: Literal["normal", "high"]
    created_at: datetime
    updated_at: datetime


class StaffTaskListResponse(BaseModel):
    tasks: list[StaffTaskResponse]


class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    comment: str | None = Field(default=None, max_length=1_000)
    route_label: str | None = Field(default=None, max_length=240)
    final_response: str | None = Field(default=None, max_length=4_000)


class FinalResponseApproval(BaseModel):
    message: str = Field(min_length=3, max_length=4_000)


class FinalResponseApprovalResponse(BaseModel):
    tracking_code: str
    status: RequestStatus
    final_response: str
    published_at: datetime


class DeviceRegistration(BaseModel):
    token: str = Field(min_length=20, max_length=4_096)
    platform: Literal["android", "ios"]
    device_name: str | None = Field(default=None, max_length=200)


class DeviceRegistrationResponse(BaseModel):
    id: str
    platform: str
    registered_at: datetime


class RequestAttachmentMetadata(BaseModel):
    """Internal metadata used after a guest uploads a requirement."""

    model_config = ConfigDict(extra="forbid")

    requirement_id: str = Field(min_length=1, max_length=120)
