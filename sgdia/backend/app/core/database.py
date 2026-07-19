"""
Módulo de conexión a MongoDB para SGDIA.

Utiliza Motor como driver asíncrono y Beanie como ODM para
proporcionar modelos de documento con validación Pydantic v2.
"""

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

# ── Estado global del módulo ─────────────────────────────────────
_motor_client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
_database: AsyncIOMotorDatabase | None = None  # type: ignore[type-arg]


async def init_db() -> None:
    """
    Inicializa la conexión a MongoDB y registra los modelos de Beanie.

    Debe invocarse durante el evento ``startup`` de la aplicación FastAPI.
    Crea el cliente Motor, selecciona la base de datos configurada y
    ejecuta ``init_beanie`` con todos los modelos de documento del proyecto.
    """
    global _motor_client, _database

    settings = get_settings()

    _motor_client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        uuidRepresentation="standard",
    )
    _database = _motor_client[settings.MONGODB_DB_NAME]

    # ── Modelos de documento ─────────────────────────────────────
    # Se importan aquí para evitar importaciones circulares y para
    # que todos los modelos estén disponibles cuando Beanie los registre.
    from app.models.audit_log import AuditLog  # noqa: F811
    from app.models.collaboration_session import CollaborationSession  # noqa: F811
    from app.models.comment import Comment  # noqa: F811
    from app.models.document import Document  # noqa: F811
    from app.models.document_version import DocumentVersion  # noqa: F811
    from app.models.folder import Folder  # noqa: F811
    from app.models.policy import Policy  # noqa: F811
    from app.models.policy_version import PolicyVersion  # noqa: F811
    from app.models.role import Role  # noqa: F811
    from app.models.user import User  # noqa: F811

    document_models = [
        User,
        Role,
        Document,
        Folder,
        DocumentVersion,
        Comment,
        AuditLog,
        Policy,
        PolicyVersion,
        CollaborationSession,
    ]

    await init_beanie(
        database=_database,
        document_models=document_models,  # type: ignore[arg-type]
    )


async def close_db() -> None:
    """
    Cierra la conexión a MongoDB de forma limpia.

    Debe invocarse durante el evento ``shutdown`` de la aplicación.
    """
    global _motor_client, _database

    if _motor_client is not None:
        _motor_client.close()
        _motor_client = None
        _database = None


def get_database() -> AsyncIOMotorDatabase:
    """
    Devuelve la instancia activa de la base de datos Motor.

    Raises:
        RuntimeError: Si la base de datos no ha sido inicializada
            (es decir, ``init_db()`` no fue ejecutada previamente).
    """
    if _database is None:
        raise RuntimeError(
            "La base de datos no está inicializada. "
            "Ejecute init_db() durante el startup de la aplicación."
        )
    return _database


def get_client() -> AsyncIOMotorClient:
    """
    Devuelve la instancia activa del cliente Motor.

    Raises:
        RuntimeError: Si el cliente no ha sido inicializado.
    """
    if _motor_client is None:
        raise RuntimeError(
            "El cliente MongoDB no está inicializado. "
            "Ejecute init_db() durante el startup de la aplicación."
        )
    return _motor_client
