import json
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Query

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.bottleneck_detector import BottleneckDetector
from app.ml.resource_optimizer import ResourceOptimizer
from app.ml.route_predictor import RoutePredictor
from app.schemas.predictions import (
    AnomalyResponse,
    BottleneckResponse,
    ModelStatusResponse,
    PredictionDashboard,
    ResourceRequest,
    ResourceResponse,
    RoutePredictionResponse,
    TrainingReadinessResponse,
)

router = APIRouter(prefix="/predictions", tags=["Predicciones ML"])

route_predictor = RoutePredictor()
bottleneck_detector = BottleneckDetector()
anomaly_detector = AnomalyDetector()
resource_optimizer = ResourceOptimizer()
_ARTIFACT_PATH = (
    Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "easydoc_route_model.json"
)
_REPORT_PATH = (
    Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "easydoc_training_report.json"
)
_READINESS_PATH = (
    Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "easydoc_training_readiness.json"
)


@router.get("/model-status", response_model=ModelStatusResponse)
async def model_status(
    current_user: dict = Depends(require_permissions("predictions:read")),
) -> ModelStatusResponse:
    """Expose the local model provenance without presenting synthetic data as production results."""
    artifact = (
        json.loads(_ARTIFACT_PATH.read_text(encoding="utf-8")) if _ARTIFACT_PATH.exists() else {}
    )
    report = json.loads(_REPORT_PATH.read_text(encoding="utf-8")) if _REPORT_PATH.exists() else {}
    metrics = report.get("metrics", {})
    provenance = report.get("data_provenance", {})
    return ModelStatusResponse(
        model_name=str(artifact.get("model_name", "easydoc_local_route_risk_v1")),
        model_type=str(artifact.get("model_type", "offline_statistical_baseline")),
        trained_at=datetime.fromisoformat(
            str(artifact.get("trained_at", datetime.now(UTC).isoformat())).replace("Z", "+00:00")
        ),
        sample_count=int(artifact.get("sample_count", 0)),
        is_synthetic=bool(provenance.get("is_synthetic", True)),
        route_match_rate=float(metrics.get("route_match_rate", 0.0)),
        duration_mae_days=float(metrics.get("duration_mae_days", 0.0)),
        policies_evaluated=int(metrics.get("policies_evaluated", 0)),
        resource_load={
            str(worker): float(load) for worker, load in artifact.get("resource_load", {}).items()
        },
    )


@router.get("/training-readiness", response_model=TrainingReadinessResponse)
async def training_readiness(
    current_user: dict = Depends(require_permissions("predictions:read")),
) -> TrainingReadinessResponse:
    """Expose the governance gate before any local model can affect operations."""
    del current_user
    if _READINESS_PATH.exists():
        readiness = json.loads(_READINESS_PATH.read_text(encoding="utf-8"))
    elif _REPORT_PATH.exists():
        report = json.loads(_REPORT_PATH.read_text(encoding="utf-8"))
        readiness = report.get("training_readiness", {})
    else:
        readiness = {}
    return TrainingReadinessResponse(
        engine=str(readiness.get("engine", "easydoc_training_governance_v1")),
        decision=str(readiness.get("decision", "blocked")),
        automation_enabled=bool(readiness.get("automation_enabled", False)),
        real_completed_workflows=int(readiness.get("real_completed_workflows", 0)),
        synthetic_workflows=int(readiness.get("synthetic_workflows", 0)),
        minimum_real_completed_workflows=int(
            readiness.get("minimum_real_completed_workflows", 200)
        ),
        policies_observed=[str(item) for item in readiness.get("policies_observed", [])],
        missing_event_fields=[str(item) for item in readiness.get("missing_event_fields", [])],
        requirements=[str(item) for item in readiness.get("requirements", [])],
        data_is_synthetic_only=bool(readiness.get("data_is_synthetic_only", True)),
    )


@router.get("/routes/{doc_id}", response_model=RoutePredictionResponse)
async def predict_route(
    doc_id: str,
    current_user: dict = Depends(require_permissions("predictions:read")),
):
    """CU-27: Predice la ruta óptima que seguirá el documento dado su tipo e historial."""
    return await route_predictor.predict(doc_id)


@router.get("/bottlenecks", response_model=BottleneckResponse)
async def get_bottlenecks(
    lookback_days: int = Query(30, ge=1, le=365, description="Ventana de análisis en días"),
    current_user: dict = Depends(require_permissions("predictions:read")),
):
    """CU-28: Detecta nodos del workflow con mayor tiempo de espera promedio."""
    return await bottleneck_detector.detect(lookback_days=lookback_days)


@router.get("/anomalies", response_model=AnomalyResponse)
async def get_anomalies(
    period_days: int = Query(7, ge=1, le=90, description="Período de análisis en días"),
    current_user: dict = Depends(require_permissions("predictions:read")),
):
    """CU-29: Devuelve comportamientos anómalos detectados en el período indicado."""
    return await anomaly_detector.detect(period_days=period_days)


@router.post("/resources", response_model=ResourceResponse)
async def optimize_resources(
    data: ResourceRequest,
    current_user: dict = Depends(require_permissions("predictions:read")),
):
    """CU-30: Ordena y prioriza ítems de trabajo según urgencia, antigüedad y tipo."""
    return await resource_optimizer.optimize(
        items=data.items,
        available_resources=data.available_resources,
    )


@router.get("/dashboard", response_model=PredictionDashboard)
async def prediction_dashboard(
    current_user: dict = Depends(require_permissions("predictions:read")),
):
    """CU-31: Dashboard ejecutivo con resumen de predicciones y alertas activas."""
    # Ejecutar todos los modelos en paralelo
    import asyncio

    bottlenecks_result, anomalies_result = await asyncio.gather(
        bottleneck_detector.detect(lookback_days=7),
        anomaly_detector.detect(period_days=7),
    )

    # Obtener promedio de días de ruta activo desde instancias completadas
    db = get_database()
    pending_count = await db["workflow_instances"].count_documents({"status": "in_progress"})
    completed_cursor = db["workflow_instances"].find({"status": "completed"}).limit(5000)
    durations = [
        duration
        async for instance in completed_cursor
        if (duration := _workflow_duration_days(instance)) is not None
    ]

    top_bottleneck = bottlenecks_result.bottlenecks[0] if bottlenecks_result.bottlenecks else None
    recent_anomalies = anomalies_result.anomalies[:5]

    return PredictionDashboard(
        bottlenecks_count=len(bottlenecks_result.bottlenecks),
        anomalies_count=anomalies_result.total,
        avg_route_days=round(sum(durations) / len(durations), 2) if durations else 0.0,
        pending_workflows=pending_count,
        top_bottleneck=top_bottleneck,
        recent_anomalies=recent_anomalies,
        last_updated=datetime.now(UTC),
    )


def _workflow_duration_days(instance: dict) -> float | None:
    history = instance.get("history", [])
    if not isinstance(history, list) or len(history) < 2:
        return None
    timestamps = [_parse_timestamp(item.get("timestamp")) for item in history]
    known = [item for item in timestamps if item is not None]
    if len(known) < 2:
        return None
    return max(0.0, (max(known) - min(known)).total_seconds() / 86400)


def _parse_timestamp(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)
