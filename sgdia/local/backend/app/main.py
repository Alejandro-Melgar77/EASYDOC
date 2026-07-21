"""
SGDIA API - Sistema de Gestión Documental con Inteligencia Artificial.

Punto de entrada principal de la aplicación FastAPI.
Configura middleware, manejo de errores, eventos de ciclo de vida
y registra todos los routers de la API.
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("sgdia")

# ---------------------------------------------------------------------------
# Lifespan – startup / shutdown events
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Administra el ciclo de vida de la aplicación.

    - **Startup**: conecta a MongoDB y Redis.
    - **Shutdown**: cierra las conexiones a MongoDB y Redis.
    """
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("🚀 Iniciando SGDIA API …")

    # MongoDB
    try:
        from app.core.database import get_database, init_db  # noqa: WPS433
        from app.services.request_service import ensure_request_indexes  # noqa: WPS433

        await init_db()
        await ensure_request_indexes(get_database())
        logger.info("✅ Conexión a MongoDB establecida")
    except Exception as exc:
        logger.error("❌ Error al conectar a MongoDB: %s", exc)
        raise

    # Redis
    try:
        from app.core.redis import init_redis  # noqa: WPS433

        await init_redis()
        from app.services.policy_collaboration import policy_collaboration_manager  # noqa: WPS433

        await policy_collaboration_manager.start()
        logger.info("✅ Conexión a Redis establecida")
    except Exception as exc:
        logger.error("❌ Error al conectar a Redis: %s", exc)
        raise

    yield  # ← la aplicación está corriendo

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("🛑 Cerrando SGDIA API …")

    try:
        from app.core.database import close_db  # noqa: WPS433

        await close_db()
        logger.info("✅ Conexión a MongoDB cerrada")
    except Exception as exc:
        logger.warning("⚠️ Error al cerrar MongoDB: %s", exc)

    try:
        from app.services.policy_collaboration import policy_collaboration_manager  # noqa: WPS433

        await policy_collaboration_manager.stop()
        from app.core.redis import close_redis  # noqa: WPS433

        await close_redis()
        logger.info("✅ Conexión a Redis cerrada")
    except Exception as exc:
        logger.warning("⚠️ Error al cerrar Redis: %s", exc)

    logger.info("👋 SGDIA API detenida correctamente")


# ---------------------------------------------------------------------------
# FastAPI application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="EASYDOC API",
    description=(
        "Sistema de Gestión Documental con Inteligencia Artificial.\n\n"
        "API REST para la gestión de documentos, usuarios, roles, "
        "políticas de retención, colaboración en tiempo real y "
        "predicciones basadas en IA."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
# En desarrollo se aceptan todos los orígenes; en producción se restringen
# mediante la variable de entorno CORS_ORIGINS.

_DEFAULT_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4200",
]

try:
    from app.core.config import get_settings  # noqa: WPS433

    _cors_origins: list[str] = get_settings().CORS_ORIGINS or _DEFAULT_ORIGINS
except Exception:
    _cors_origins = _DEFAULT_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request Logging Middleware & Audit Middleware
# ---------------------------------------------------------------------------

from app.middleware.audit_middleware import AuditMiddleware

app.add_middleware(AuditMiddleware)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Middleware que registra cada petición HTTP entrante con su duración,
    método, ruta, código de respuesta y un ID de correlación único.
    """
    request_id = str(uuid.uuid4())[:8]
    start_time = time.perf_counter()

    # Inyectar request_id en el estado para uso posterior
    request.state.request_id = request_id

    logger.info(
        "[%s] ➜  %s %s",
        request_id,
        request.method,
        request.url.path,
    )

    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed = (time.perf_counter() - start_time) * 1000
        logger.error(
            "[%s] ✖  %s %s — %.1f ms — Error: %s",
            request_id,
            request.method,
            request.url.path,
            elapsed,
            exc,
        )
        raise

    elapsed = (time.perf_counter() - start_time) * 1000
    logger.info(
        "[%s] ✔  %s %s — %d — %.1f ms",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )

    response.headers["X-Request-ID"] = request_id
    return response


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Devuelve errores HTTP en un formato JSON consistente."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail or "Error desconocido",
            },
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Devuelve errores de validación de Pydantic como JSON legible."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": 422,
                "message": "Error de validación en la solicitud",
                "details": jsonable_encoder(exc.errors()),
            },
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Captura cualquier excepción no controlada y responde con 500."""
    logger.exception(
        "Excepción no controlada en %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": 500,
                "message": "Error interno del servidor",
            },
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# ---------------------------------------------------------------------------
# Health-check endpoint
# ---------------------------------------------------------------------------


@app.get(
    "/api/health",
    tags=["Health"],
    summary="Verificación de salud",
    response_description="Estado de salud del servicio y sus dependencias",
)
async def health_check() -> dict:
    """
    Endpoint de verificación de salud de la API.

    Comprueba la conectividad con MongoDB y Redis y devuelve el estado
    individual de cada servicio junto con el estado global.
    """
    health: dict = {
        "status": "healthy",
        "version": app.version,
        "service": app.title,
        "checks": {},
    }

    # -- MongoDB --
    try:
        from app.core.database import get_client  # noqa: WPS433

        client = get_client()
        await client.admin.command("ping")
        health["checks"]["mongodb"] = {"status": "connected"}
    except Exception as exc:
        health["checks"]["mongodb"] = {
            "status": "disconnected",
            "error": str(exc),
        }
        health["status"] = "unhealthy"

    # -- Redis --
    try:
        from app.core.redis import get_redis  # noqa: WPS433

        redis_client = get_redis()
        if redis_client is not None:
            await redis_client.ping()
            health["checks"]["redis"] = {"status": "connected"}
        else:
            health["checks"]["redis"] = {"status": "not_initialized"}
            health["status"] = "degraded"
    except Exception as exc:
        health["checks"]["redis"] = {
            "status": "disconnected",
            "error": str(exc),
        }
        health["status"] = "unhealthy"

    return health


# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------
# Los routers se registrarán conforme se implementen los módulos.
# Por ahora quedan comentados para evitar errores de importación.

API_PREFIX = "/api"

# from app.routers import auth as auth_router
# from app.routers import users as users_router
# from app.routers import roles as roles_router
from app.routers import agent as agent_router
from app.routers import audit as audit_router
from app.routers import auth as auth_router
from app.routers import collaboration as collab_router
from app.routers import documents as documents_router
from app.routers import notifications as notifications_router
from app.routers import policies as policies_router
from app.routers import predictions as predictions_router
from app.routers import reports as reports_router
from app.routers import requests as requests_router
from app.routers import roles as roles_router
from app.routers import settings as settings_router
from app.routers import users as users_router
from app.routers import ws_agent as ws_agent_router
from app.routers import ws_collaboration as ws_collab_router
from app.routers import ws_notifications as ws_notifications_router
from app.routers import ws_policy_collaboration as ws_policy_collaboration_router

app.include_router(auth_router.router, prefix=f"{API_PREFIX}", tags=["Autenticación"])
app.include_router(users_router.router, prefix=f"{API_PREFIX}", tags=["Usuarios"])
app.include_router(roles_router.router, prefix=f"{API_PREFIX}", tags=["Roles"])
app.include_router(documents_router.router, prefix=f"{API_PREFIX}", tags=["Documentos"])
app.include_router(collab_router.router, prefix=f"{API_PREFIX}", tags=["Colaboración"])
app.include_router(ws_collab_router.router)
app.include_router(policies_router.router, prefix=f"{API_PREFIX}", tags=["Políticas"])
app.include_router(ws_policy_collaboration_router.router)
app.include_router(requests_router.public_router, prefix=API_PREFIX)
app.include_router(requests_router.staff_router, prefix=API_PREFIX)
app.include_router(agent_router.router, prefix=f"{API_PREFIX}", tags=["Agente IA"])
app.include_router(ws_agent_router.router)
app.include_router(predictions_router.router, prefix=f"{API_PREFIX}", tags=["Predicciones ML"])
app.include_router(reports_router.router, prefix=f"{API_PREFIX}", tags=["Reportes"])
app.include_router(notifications_router.router, prefix=f"{API_PREFIX}", tags=["Notificaciones"])
app.include_router(ws_notifications_router.router)
app.include_router(audit_router.router, prefix=f"{API_PREFIX}", tags=["Auditoría"])
app.include_router(settings_router.router, prefix=f"{API_PREFIX}", tags=["Configuración"])

# ---------------------------------------------------------------------------
# Entrypoint (desarrollo local)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
