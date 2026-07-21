import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.schemas.notifications import AuditLogListResponse, AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Auditoría"])


@router.get("/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    user_id: str | None = Query(None),
    action: str | None = Query(None),
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_permissions("audit:read")),
):
    """CU-38: Logs de auditoría con filtros avanzados."""
    db = get_database()
    query: dict = {}

    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = {"$regex": action, "$options": "i"}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if date_from or date_to:
        ts_filter: dict = {}
        if date_from:
            ts_filter["$gte"] = date_from
        if date_to:
            ts_filter["$lte"] = date_to
        query["timestamp"] = ts_filter

    skip = (page - 1) * page_size
    total = await db["audit_logs"].count_documents(query)
    logs = []
    async for log in db["audit_logs"].find(query).sort("timestamp", -1).skip(skip).limit(page_size):
        log["id"] = str(log["_id"])
        logs.append(AuditLogResponse(**log))

    return AuditLogListResponse(logs=logs, total=total, page=page, page_size=page_size)


@router.get("/trace/{entity_id}", response_model=AuditLogListResponse)
async def trace_entity(
    entity_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_permissions("audit:read")),
):
    """CU-39: Trazabilidad completa de una entidad (documento, usuario, workflow…)."""
    db = get_database()
    query = {"entity_id": entity_id}
    skip = (page - 1) * page_size
    total = await db["audit_logs"].count_documents(query)
    logs = []
    async for log in db["audit_logs"].find(query).sort("timestamp", 1).skip(skip).limit(page_size):
        log["id"] = str(log["_id"])
        logs.append(AuditLogResponse(**log))

    return AuditLogListResponse(logs=logs, total=total, page=page, page_size=page_size)


@router.get("/export")
async def export_audit_logs(
    fmt: str = Query("csv", pattern="^(csv|json)$"),
    user_id: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    current_user: dict = Depends(require_permissions("audit:export")),
):
    """Exporta logs de auditoría como CSV o JSON."""
    db = get_database()
    query: dict = {}
    if user_id:
        query["user_id"] = user_id
    if date_from or date_to:
        ts: dict = {}
        if date_from:
            ts["$gte"] = date_from
        if date_to:
            ts["$lte"] = date_to
        query["timestamp"] = ts

    rows = []
    async for log in db["audit_logs"].find(query).sort("timestamp", -1).limit(10000):
        rows.append(
            {
                "id": str(log.get("_id", "")),
                "user_id": str(log.get("user_id", "")),
                "action": log.get("action", ""),
                "entity_type": log.get("entity_type", ""),
                "entity_id": str(log.get("entity_id", "")),
                "ip_address": log.get("ip_address", ""),
                "timestamp": str(log.get("timestamp", "")),
            }
        )

    if fmt == "json":
        content = json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=audit_logs.json"},
        )
    else:
        buf = io.StringIO()
        if rows:
            writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
        )
