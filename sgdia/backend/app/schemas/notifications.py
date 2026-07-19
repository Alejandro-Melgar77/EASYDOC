from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel


class NotificationType(str, Enum):
    info = "info"
    warning = "warning"
    error = "error"
    success = "success"


class NotificationChannel(str, Enum):
    in_app = "in_app"
    email = "email"
    push = "push"


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    body: str
    type: str
    channel: str
    is_read: bool
    entity_type: str | None
    entity_id: str | None
    created_at: datetime


class AuditLogResponse(BaseModel):
    id: str
    user_id: str | None
    action: str
    entity_type: str | None
    entity_id: str | None
    ip_address: str | None
    details: dict[str, Any] | None
    timestamp: datetime


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


class SystemSetting(BaseModel):
    key: str
    value: Any
    description: str | None = None


class SettingsUpdate(BaseModel):
    settings: list[SystemSetting]
