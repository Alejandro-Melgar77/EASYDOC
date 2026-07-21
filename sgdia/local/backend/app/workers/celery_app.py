"""
Configuración de la aplicación Celery para SGDIA.

Este módulo define la instancia principal de Celery utilizada por los workers
y el scheduler (beat) para el procesamiento asíncrono de tareas.

Uso:
    # Iniciar worker:
    celery -A app.workers.celery_app worker --loglevel=info

    # Iniciar beat (tareas programadas):
    celery -A app.workers.celery_app beat --loglevel=info
"""

import os

from celery import Celery

# ---------------------------------------------------------------------------
# Configuración del broker y backend
# ---------------------------------------------------------------------------
# Se leen de variables de entorno para mantener flexibilidad entre
# desarrollo local y producción. En desarrollo se usa Redis sin password;
# en producción se debe configurar con autenticación.
CELERY_BROKER_URL: str = os.getenv(
    "CELERY_BROKER_URL",
    "redis://redis:6379/1",
)
CELERY_RESULT_BACKEND: str = os.getenv(
    "CELERY_RESULT_BACKEND",
    "redis://redis:6379/2",
)

# ---------------------------------------------------------------------------
# Instancia de Celery
# ---------------------------------------------------------------------------
celery_app = Celery(
    "sgdia_workers",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

# ---------------------------------------------------------------------------
# Configuración general
# ---------------------------------------------------------------------------
celery_app.conf.update(
    # Serialización
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Zona horaria
    timezone="America/La_Paz",
    enable_utc=True,
    # Comportamiento de tareas
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Expiración de resultados (48 horas)
    result_expires=172800,
    # Reintentos de conexión al broker al arrancar
    broker_connection_retry_on_startup=True,
    # Colas personalizadas
    task_default_queue="default",
    task_create_missing_queues=True,
)

from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Escaneo de anomalías cada 6 horas
    "ml-anomaly-scan-every-6h": {
        "task": "ml.run_anomaly_scan",
        "schedule": crontab(minute=0, hour="*/6"),
    },
    # Re-entrenamiento del modelo de rutas cada domingo a las 3 AM
    "ml-retrain-route-model-weekly": {
        "task": "ml.retrain_route_model",
        "schedule": crontab(minute=0, hour=3, day_of_week="sunday"),
    },
    # Limpieza de tokens JWT expirados en Redis cada hora
    "cleanup-expired-jwt-hourly": {
        "task": "app.workers.ml_tasks.run_anomaly_scan",  # placeholder
        "schedule": crontab(minute=30),
    },
}

# ---------------------------------------------------------------------------
# Autodescubrimiento de tareas
# ---------------------------------------------------------------------------
# Celery buscará automáticamente módulos de tareas dentro de estos paquetes.
celery_app.autodiscover_tasks(
    [
        "app.workers",
    ]
)
