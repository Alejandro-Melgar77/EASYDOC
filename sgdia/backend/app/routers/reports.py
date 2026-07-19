import io
from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.schemas.common import MessageResponse
from app.schemas.reports import (
    ReportCreate,
    ReportResponse,
    ReportSchedule,
    ReportTemplateCreate,
    ReportTemplateResponse,
)
from app.services.asr_service import ASRService, LocalASRUnavailableError
from app.services.audit_service import AuditService
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/reports", tags=["Reportes"])
generator = ReportGenerator()


# ── CU-32: Generar reporte por formulario ───────────────────────────────────


@router.post("/", response_model=ReportResponse, status_code=202)
async def create_report(
    data: ReportCreate,
    request: Request,
    current_user: dict = Depends(require_permissions("reports:create")),
):
    """
    CU-32: Crea una solicitud de reporte.
    Los reportes pequeños se generan en línea (<5 s); los grandes se delegan
    a Celery y el cliente puede hacer polling sobre GET /reports/{id}.
    """
    db = get_database()

    report_doc = {
        "title": data.title,
        "report_type": data.report_type,
        "format": data.format.value,
        "filters": data.filters or {},
        "date_from": data.date_from,
        "date_to": data.date_to,
        "status": "processing",
        "created_by": current_user["sub"],
        "created_at": datetime.now(UTC),
        "completed_at": None,
        "download_url": None,
        "error": None,
    }
    result = await db["reports"].insert_one(report_doc)
    report_id = str(result.inserted_id)

    # Para prototipos: generar en línea y devolver URL directa
    try:
        content, content_type = await generator.generate(
            report_type=data.report_type,
            fmt=data.format.value,
            title=data.title,
            filters=data.filters,
            date_from=data.date_from,
            date_to=data.date_to,
        )
        # En producción: subir a S3. Aquí devolvemos como stream.
        download_url = f"/api/reports/{report_id}/download"
        await db["reports"].update_one(
            {"_id": result.inserted_id},
            {
                "$set": {
                    "status": "ready",
                    "download_url": download_url,
                    "completed_at": datetime.now(UTC),
                }
            },
        )
    except Exception as exc:
        await db["reports"].update_one(
            {"_id": result.inserted_id},
            {"$set": {"status": "failed", "error": str(exc)}},
        )

    ip = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["REPORT_GENERATE"],
        entity_type="report",
        entity_id=report_id,
        ip_address=ip,
    )

    report = await db["reports"].find_one({"_id": result.inserted_id})
    report["id"] = str(report["_id"])
    return ReportResponse(**report)


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: dict = Depends(require_permissions("reports:read")),
):
    """CU-35: Descarga el archivo generado del reporte."""
    db = get_database()
    report = await db["reports"].find_one({"_id": ObjectId(report_id)})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["status"] != "ready":
        raise HTTPException(status_code=409, detail=f"Report not ready: {report['status']}")

    content, content_type = await generator.generate(
        report_type=report["report_type"],
        fmt=report["format"],
        title=report["title"],
        filters=report.get("filters"),
        date_from=report.get("date_from"),
        date_to=report.get("date_to"),
    )
    ext_map = {"pdf": "pdf", "excel": "xlsx", "csv": "csv", "json": "json"}
    ext = ext_map.get(report["format"], "bin")
    filename = f"{report['title'].replace(' ', '_')}.{ext}"

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── CU-33: Reporte por voz ──────────────────────────────────────────────────


@router.post("/voice", response_model=ReportResponse, status_code=202)
async def create_report_by_voice(
    request: Request,
    audio: UploadFile = File(...),
    current_user: dict = Depends(require_permissions("reports:create")),
):
    """
    CU-33: El usuario graba un comando de voz; la API transcribe con ASR y
    extrae los parámetros del reporte usando el LLM.
    """
    content = await audio.read()
    try:
        transcription = await ASRService.transcribe_audio(audio, content)
    except LocalASRUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Parseo simple de la transcripción (en producción: usar NLU/LLM)
    report_type = "activity"
    if "documento" in transcription.lower():
        report_type = "documents"
    elif "workflow" in transcription.lower() or "proceso" in transcription.lower():
        report_type = "workflows"

    data = ReportCreate(
        title=f"Reporte por voz — {datetime.now(UTC).strftime('%Y-%m-%d')}",
        report_type=report_type,
        format="pdf",
    )
    return await create_report(data, request, current_user)


# ── CU-34: Programar reporte recurrente ─────────────────────────────────────


@router.post("/schedule", response_model=MessageResponse)
async def schedule_report(
    data: ReportSchedule,
    current_user: dict = Depends(require_permissions("reports:create")),
):
    """CU-34: Programa un reporte recurrente con expresión cron."""
    db = get_database()
    schedule_doc = {
        "title": data.title,
        "report_type": data.report_type,
        "format": data.format.value,
        "cron_expression": data.cron_expression,
        "filters": data.filters or {},
        "recipients": data.recipients,
        "created_by": current_user["sub"],
        "created_at": datetime.now(UTC),
        "is_active": True,
    }
    result = await db["report_schedules"].insert_one(schedule_doc)
    return MessageResponse(
        message=f"Report scheduled with id {result.inserted_id}",
        status_code=201,
    )


# ── CU-36: Plantillas de reporte ────────────────────────────────────────────


@router.post("/templates", response_model=ReportTemplateResponse, status_code=201)
async def create_template(
    data: ReportTemplateCreate,
    current_user: dict = Depends(require_permissions("reports:create")),
):
    """CU-36: Crea una plantilla reutilizable de reporte."""
    db = get_database()
    doc = {
        "name": data.name,
        "report_type": data.report_type,
        "format": data.format.value,
        "default_filters": data.default_filters or {},
        "description": data.description,
        "created_by": current_user["sub"],
        "created_at": datetime.now(UTC),
    }
    result = await db["report_templates"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return ReportTemplateResponse(**doc)


@router.get("/templates", response_model=list[ReportTemplateResponse])
async def list_templates(
    current_user: dict = Depends(require_permissions("reports:read")),
):
    """CU-36: Lista plantillas disponibles."""
    db = get_database()
    templates = []
    async for t in db["report_templates"].find():
        t["id"] = str(t["_id"])
        templates.append(ReportTemplateResponse(**t))
    return templates
