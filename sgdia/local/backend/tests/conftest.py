"""
tests/conftest.py

Fixtures globales de pytest para el backend SGDIA.
Usa httpx.AsyncClient con el app FastAPI y mocks de MongoDB/Redis.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import app.core.database as core_database
import app.core.redis as core_redis
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


class AsyncCursor:
    def __init__(self, rows=None):
        self.rows = rows or []

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def skip(self, *args, **kwargs):
        return self

    def __aiter__(self):
        async def iterator():
            for row in self.rows:
                yield row

        return iterator()


# ─────────────────────────────────────────────────────────────────────────────
# Configuración pytest-asyncio
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


# ─────────────────────────────────────────────────────────────────────────────
# Mocks globales de infraestructura
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def mock_redis():
    """Mock de Redis para todos los tests — evita requerir instancia real."""
    redis_mock = AsyncMock()
    redis_mock.get = AsyncMock(return_value=None)
    redis_mock.set = AsyncMock(return_value=True)
    redis_mock.delete = AsyncMock(return_value=1)
    redis_mock.ping = AsyncMock(return_value=True)

    with patch.object(core_redis, "_redis_client", redis_mock):
        with patch.object(core_redis, "get_redis", return_value=redis_mock):
            yield redis_mock


@pytest.fixture(autouse=True)
def mock_database():
    """Mock de la base de datos Motor para todos los tests."""
    db_mock = MagicMock()
    collections = {}

    # Mock de colecciones comunes
    for _col in [
        "users",
        "roles",
        "documents",
        "document_versions",
        "audit_logs",
        "notifications",
        "policies",
        "workflow_instances",
        "agent_history",
    ]:
        col_mock = AsyncMock()
        col_mock.find_one = AsyncMock(return_value=None)
        col_mock.insert_one = AsyncMock(return_value=MagicMock(inserted_id="test_id_123"))
        col_mock.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        col_mock.delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
        col_mock.count_documents = AsyncMock(return_value=0)

        cursor_mock = AsyncCursor()
        col_mock.find = MagicMock(return_value=cursor_mock)
        col_mock.aggregate = MagicMock(return_value=cursor_mock)
        collections[_col] = col_mock

    db_mock.__getitem__.side_effect = lambda name: collections[name]

    with (
        patch.object(core_database, "_database", db_mock),
        patch.object(core_database, "get_database", return_value=db_mock),
        patch("app.ml.route_predictor.get_database", return_value=db_mock),
        patch("app.ml.bottleneck_detector.get_database", return_value=db_mock),
        patch("app.ml.anomaly_detector.get_database", return_value=db_mock),
    ):
        yield db_mock


# ─────────────────────────────────────────────────────────────────────────────
# Cliente HTTP async
# ─────────────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def client():
    """AsyncClient de httpx conectado directamente al app ASGI."""
    # Patch del lifespan para no conectar a servicios reales
    with patch.object(core_database, "init_db", AsyncMock()):
        with patch.object(core_redis, "init_redis", AsyncMock()):
            from app.main import app

            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as ac:
                yield ac


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures de datos de prueba
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def admin_token_payload():
    """Payload JWT de un administrador de prueba."""
    return {
        "sub": "user_admin_test_id",
        "email": "admin@sgdia.test",
        "roles": ["admin", "Administrador"],
        "permissions": [
            "documents:read",
            "documents:write",
            "documents:delete",
            "users:read",
            "users:write",
            "roles:read",
            "roles:write",
            "roles:delete",
            "policies:read",
            "policies:write",
            "policies:approve",
            "reports:read",
            "reports:create",
            "audit:read",
            "audit:export",
            "predictions:read",
            "agent:use",
            "workflows:execute",
        ],
        "is_active": True,
        "type": "access",
    }


@pytest.fixture
def user_token_payload():
    """Payload JWT de un usuario estándar de prueba."""
    return {
        "sub": "user_regular_test_id",
        "email": "user@sgdia.test",
        "roles": ["usuario"],
        "permissions": [
            "documents:read",
            "agent:use",
        ],
        "is_active": True,
        "type": "access",
    }


@pytest.fixture
def mock_admin_jwt(admin_token_payload):
    """
    Parchea get_current_user para devolver siempre el payload admin.
    Úsalo con: @pytest.mark.usefixtures("mock_admin_jwt")
    """
    with patch(
        "app.core.dependencies.get_current_user",
        AsyncMock(return_value=admin_token_payload),
    ):
        with patch(
            "app.core.dependencies.get_current_active_user",
            AsyncMock(return_value=admin_token_payload),
        ):
            yield admin_token_payload
