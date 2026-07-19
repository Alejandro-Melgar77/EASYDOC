"""
Tarea 7.1 (cont.) — Celery tasks para reportes asíncronos y programados.
"""

import asyncio
import logging
from datetime import UTC, datetime

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="reports.generate_async", queue="documents", bind=True)
def generate_report_async(
    self,
    report_id: str,
    report_type: str,
    fmt: str,
    title: str,
    filters: dict,
    date_from_iso: str | None,
    date_to_iso: str | None,
    user_id: str,
):
    """
    Genera el reporte, sube a S3 y actualiza el estado en MongoDB.
    Llamada desde el endpoint POST /reports cuando el volumen puede ser grande.
    """
    from app.services.report_generator import ReportGenerator
    from app.services.storage_service import StorageService

    async def _run():
        from app.core.database import get_database

        db = get_database()

        date_from = datetime.fromisoformat(date_from_iso) if date_from_iso else None
        date_to = datetime.fromisoformat(date_to_iso) if date_to_iso else None

        generator = ReportGenerator()
        try:
            content, content_type = await generator.generate(
                report_type=report_type,
                fmt=fmt,
                title=title,
                filters=filters,
                date_from=date_from,
                date_to=date_to,
            )

            # Subir a S3 / MinIO
            ext_map = {"pdf": "pdf", "excel": "xlsx", "csv": "csv", "json": "json"}
            ext = ext_map.get(fmt, "bin")
            key = f"reports/{report_id}.{ext}"

            storage = StorageService()
            storage.s3_client.put_object(
                Bucket=storage.bucket_name,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
            download_url = storage.get_presigned_url(key, expires_in=86400)

            await db["reports"].update_one(
                {"_id": report_id},
                {
                    "$set": {
                        "status": "ready",
                        "download_url": download_url,
                        "completed_at": datetime.now(UTC),
                    }
                },
            )
        except Exception as exc:
            logger.error("Report generation failed for %s: %s", report_id, exc)
            await db["reports"].update_one(
                {"_id": report_id},
                {"$set": {"status": "failed", "error": str(exc)}},
            )
            raise

    asyncio.run(_run())
    return {"report_id": report_id, "status": "ready"}


@shared_task(name="reports.run_scheduled", queue="default")
def run_scheduled_report(schedule_id: str):
    """
    Ejecuta un reporte programado. Esta tarea se dispara desde celery-beat
    según el cron_expression configurado en el schedule.
    """
    import asyncio

    async def _run():
        from bson import ObjectId

        from app.core.database import get_database

        db = get_database()
        sched = await db["report_schedules"].find_one({"_id": ObjectId(schedule_id)})
        if not sched:
            logger.warning("Schedule %s not found", schedule_id)
            return

        logger.info("Running scheduled report: %s", sched.get("title"))
        # Encolar la generación real
        generate_report_async.delay(
            report_id=schedule_id + "_auto",
            report_type=sched["report_type"],
            fmt=sched["format"],
            title=sched["title"],
            filters=sched.get("filters", {}),
            date_from_iso=None,
            date_to_iso=None,
            user_id="scheduler",
        )

    asyncio.run(_run())
