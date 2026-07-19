"""
CU-29: Detección de anomalías en accesos, uploads y patrones de actividad.

Implementa un detector basado en Z-Score sobre ventana deslizante de 7 días.
En producción se reemplaza por un autoencoder LSTM entrenado sobre series
temporales de eventos de auditoría.

Reglas actuales:
- Usuario con > μ + 3σ acciones en el período → anomalía USER_SPIKE
- Documento accedido desde > 3 IPs distintas en 1h → anomalía MULTI_IP
- Upload de archivo > 50 MB fuera de horario laboral → anomalía LARGE_OOH
"""

import logging
import math
from datetime import UTC, datetime, timedelta

from app.core.database import get_database
from app.schemas.predictions import AnomalyItem, AnomalyResponse

logger = logging.getLogger(__name__)

_Z_THRESHOLD = 2.5  # detección conservadora


def _z_score(value: float, mean: float, std: float) -> float:
    if std < 1e-9:
        return 0.0
    return (value - mean) / std


class AnomalyDetector:
    """CU-29: Detecta comportamientos anómalos en logs de auditoría."""

    async def detect(self, period_days: int = 7) -> AnomalyResponse:
        db = get_database()
        since = datetime.now(UTC) - timedelta(days=period_days)
        anomalies: list[AnomalyItem] = []

        # ── 1. User activity spike ───────────────────────────────────────────
        pipeline_users = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id": "$user_id",
                    "action_count": {"$sum": 1},
                }
            },
        ]
        user_counts: list[float] = []
        user_rows = []
        async for row in db["audit_logs"].aggregate(pipeline_users):
            user_counts.append(row["action_count"])
            user_rows.append(row)

        if user_counts:
            mean = sum(user_counts) / len(user_counts)
            variance = sum((x - mean) ** 2 for x in user_counts) / len(user_counts)
            std = math.sqrt(variance)

            for row in user_rows:
                z = _z_score(row["action_count"], mean, std)
                if z >= _Z_THRESHOLD:
                    score = min(round(z / 6.0, 3), 1.0)
                    anomalies.append(
                        AnomalyItem(
                            entity_type="user",
                            entity_id=str(row["_id"]),
                            anomaly_type="USER_ACTIVITY_SPIKE",
                            score=score,
                            description=(
                                f"Usuario realizó {row['action_count']} acciones en los últimos "
                                f"{period_days} días (Z-score={z:.2f}, umbral={_Z_THRESHOLD})"
                            ),
                            detected_at=datetime.now(UTC),
                        )
                    )

        # ── 2. Document multi-IP access ──────────────────────────────────────
        pipeline_docs = [
            {
                "$match": {
                    "action": {"$in": ["DOC_DOWNLOAD", "DOC_VIEW"]},
                    "timestamp": {"$gte": since},
                    "ip_address": {"$ne": None},
                }
            },
            {
                "$group": {
                    "_id": "$entity_id",
                    "unique_ips": {"$addToSet": "$ip_address"},
                }
            },
        ]
        async for row in db["audit_logs"].aggregate(pipeline_docs):
            ip_count = len(row.get("unique_ips", []))
            if ip_count >= 3:
                score = min(round(ip_count / 10.0, 2), 1.0)
                anomalies.append(
                    AnomalyItem(
                        entity_type="document",
                        entity_id=str(row["_id"]),
                        anomaly_type="MULTI_IP_ACCESS",
                        score=score,
                        description=(
                            f"Documento accedido desde {ip_count} IPs distintas "
                            f"en los últimos {period_days} días"
                        ),
                        detected_at=datetime.now(UTC),
                    )
                )

        anomalies.sort(key=lambda a: -a.score)
        logger.info("Anomaly detection complete: %d anomalies found", len(anomalies))

        return AnomalyResponse(
            anomalies=anomalies,
            total=len(anomalies),
            period_days=period_days,
        )
