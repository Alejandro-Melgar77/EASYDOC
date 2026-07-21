"""
Tarea 6.3: Celery workers para tareas ML asíncronas.

Las tareas de inferencia pesada (re-entrenamiento, embedding batch, etc.)
se delegan a este módulo para no bloquear los workers de la API.
"""

import json
import logging
from pathlib import Path

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="ml.retrain_route_model", queue="documents")
def retrain_route_model():
    """
    Re-entrena el modelo de predicción de ruta usando el historial de workflows
    completados. Ejecuta en la cola 'documents' por ser una operación intensiva.
    En producción: extrae features de MongoDB, entrena sklearn pipeline, serializa
    con joblib y sube el artefacto a S3.
    """
    from app.ml.agentic_dataset import build_agentic_cases
    from app.ml.demo_dataset import build_demo_dataset
    from app.ml.local_training import save_artifact, train_route_model
    from app.ml.operational_training import build_training_report
    from app.ml.training_governance import build_training_readiness

    dataset = build_demo_dataset()
    agent_cases = build_agentic_cases()
    dataset["agentic_cases"] = agent_cases["cases"]
    artifact = train_route_model(dataset)
    report = build_training_report(dataset)
    artifact_dir = Path(__file__).resolve().parents[1] / "ml" / "artifacts"
    save_artifact(artifact)
    (artifact_dir / "easydoc_training_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    readiness = build_training_readiness(dataset)
    (artifact_dir / "easydoc_training_readiness.json").write_text(
        json.dumps(readiness, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    logger.info(
        "[ML] Local route baseline regenerated with %d synthetic workflows", artifact.sample_count
    )
    return {"status": "ok", "model": artifact.model_name, "decision": readiness["decision"]}


@shared_task(name="ml.generate_embeddings_batch", queue="documents")
def generate_embeddings_batch(document_ids: list[str]):
    """
    Genera embeddings vectoriales para un lote de documentos y los persiste
    en el campo 'embedding' de cada documento en MongoDB.
    En producción: llama a OpenAI Embeddings API o modelo local (sentence-transformers).
    """
    logger.info("[ML] Batch embedding requested for %d documents", len(document_ids))
    return {
        "status": "deferred",
        "processed": 0,
        "reason": "La indexacion por lote requiere un worker conectado a MongoDB; no se simula.",
    }


@shared_task(name="ml.run_anomaly_scan", queue="default")
def run_anomaly_scan():
    """
    Tarea programada (beat) que ejecuta el detector de anomalías y genera
    alertas/notificaciones para el equipo de seguridad.
    Se programa cada 6 horas en celery_app.beat_schedule.
    """
    import asyncio

    from app.ml.anomaly_detector import AnomalyDetector

    async def _run():
        detector = AnomalyDetector()
        result = await detector.detect(period_days=1)
        logger.info("[ML] Anomaly scan: %d anomalies found", result.total)
        return result.total

    total = asyncio.run(_run())
    return {"status": "ok", "anomalies_found": total}
