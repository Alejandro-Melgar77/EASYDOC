"""
CU-40: Configuración de la plataforma con hot-reload (sin reinicio del proceso).

Los settings se persisten en MongoDB (colección 'system_settings') y se
leen en cada petición que los necesite. Un cambio via PUT /settings recarga
el cache en Redis para que todos los workers lo vean inmediatamente.
"""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends

from app.core.database import get_database
from app.core.dependencies import require_roles
from app.core.redis import get_redis
from app.schemas.common import MessageResponse
from app.schemas.notifications import SettingsUpdate, SystemSetting

router = APIRouter(prefix="/settings", tags=["Configuración"])

_REDIS_KEY = "sgdia:system_settings"


async def _load_from_db(db) -> list[dict]:
    return [s async for s in db["system_settings"].find({}, {"_id": 0})]


@router.get("/", response_model=list[SystemSetting])
async def get_settings_endpoint(
    current_user: dict = Depends(require_roles("admin")),
):
    """CU-40: Lee la configuración del sistema (cache Redis → MongoDB)."""
    redis = get_redis()

    # Try cache first
    cached = await redis.get(_REDIS_KEY)
    if cached:
        raw = json.loads(cached)
        return [SystemSetting(**s) for s in raw]

    db = get_database()
    rows = await _load_from_db(db)

    await redis.set(_REDIS_KEY, json.dumps(rows), ex=300)  # TTL 5 min
    return [SystemSetting(**r) for r in rows]


@router.put("/", response_model=MessageResponse)
async def update_settings(
    data: SettingsUpdate,
    current_user: dict = Depends(require_roles("admin")),
):
    """CU-40: Actualiza settings sin reinicio; invalida cache Redis."""
    db = get_database()
    for setting in data.settings:
        await db["system_settings"].update_one(
            {"key": setting.key},
            {
                "$set": {
                    "key": setting.key,
                    "value": setting.value,
                    "description": setting.description,
                    "updated_by": current_user["sub"],
                    "updated_at": datetime.now(UTC),
                }
            },
            upsert=True,
        )

    # Invalidar cache
    redis = get_redis()
    await redis.delete(_REDIS_KEY)

    return MessageResponse(
        message=f"{len(data.settings)} setting(s) updated and cache invalidated",
        status_code=200,
    )
