from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel


class ReportFormat(str, Enum):
    pdf = "pdf"
    excel = "excel"
    csv = "csv"
    json = "json"


class ReportStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class ReportCreate(BaseModel):
    title: str
    report_type: str  # activity | documents | workflows | audit | custom
    format: ReportFormat = ReportFormat.pdf
    filters: dict[str, Any] | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class ReportSchedule(BaseModel):
    title: str
    report_type: str
    format: ReportFormat = ReportFormat.pdf
    cron_expression: str  # e.g. "0 8 * * 1" = every Monday 8 AM
    filters: dict[str, Any] | None = None
    recipients: list[str] = []  # email addresses


class ReportResponse(BaseModel):
    id: str
    title: str
    report_type: str
    format: str
    status: str
    created_by: str
    created_at: datetime
    completed_at: datetime | None = None
    download_url: str | None = None
    error: str | None = None


class ReportTemplateCreate(BaseModel):
    name: str
    report_type: str
    format: ReportFormat
    default_filters: dict[str, Any] | None = None
    description: str | None = None


class ReportTemplateResponse(BaseModel):
    id: str
    name: str
    report_type: str
    format: str
    default_filters: dict[str, Any] | None
    description: str | None
    created_by: str
    created_at: datetime
