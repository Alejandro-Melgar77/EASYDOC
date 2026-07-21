"""
Módulo de conexión a Redis para SGDIA.

Proporciona funciones de ciclo de vida (init/close), acceso al
cliente Redis asíncrono, y helpers de caché y blacklist de JWT.
"""

import hashlib
import json
from typing import Any

import redis.asyncio as aioredis

from app.core.config import get_settings

# ── Estado global del módulo ─────────────────────────────────────
_redis_client: aioredis.Redis | None = None  # type: ignore[type-arg]

# Prefijos de clave para organizar el espacio de nombres en Redis
_CACHE_PREFIX = "sgdia:cache:"
_BLACKLIST_PREFIX = "sgdia:jwt_blacklist:"


async def init_redis() -> None:
    """
    Crea el pool de conexiones Redis.

    Debe invocarse durante el evento ``startup`` de la aplicación FastAPI.
    """
    global _redis_client

    settings = get_settings()

    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        max_connections=20,
    )

    # Verificar conectividad
    await _redis_client.ping()


async def close_redis() -> None:
    """
    Cierra el pool de conexiones Redis de forma limpia.

    Debe invocarse durante el evento ``shutdown`` de la aplicación.
    """
    global _redis_client

    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


def get_redis() -> aioredis.Redis:
    """
    Devuelve la instancia activa del cliente Redis.

    Raises:
        RuntimeError: Si Redis no ha sido inicializado.
    """
    if _redis_client is None:
        raise RuntimeError(
            "Redis no está inicializado. Ejecute init_redis() durante el startup de la aplicación."
        )
    return _redis_client


# ── Helpers de caché ─────────────────────────────────────────────


async def set_cache(key: str, value: Any, ttl: int = 300) -> None:
    """
    Almacena un valor en caché serializado como JSON.

    Args:
        key: Clave lógica (se le agrega prefijo automáticamente).
        value: Cualquier valor serializable a JSON.
        ttl: Tiempo de vida en segundos (por defecto 5 minutos).
    """
    client = get_redis()
    serialized = json.dumps(value, ensure_ascii=False, default=str)
    await client.set(f"{_CACHE_PREFIX}{key}", serialized, ex=ttl)


async def get_cache(key: str) -> Any | None:
    """
    Recupera un valor de la caché.

    Args:
        key: Clave lógica (se le agrega prefijo automáticamente).

    Returns:
        El valor deserializado o ``None`` si la clave no existe o expiró.
    """
    client = get_redis()
    raw = await client.get(f"{_CACHE_PREFIX}{key}")
    if raw is None:
        return None
    return json.loads(raw)


async def delete_cache(key: str) -> bool:
    """
    Elimina una clave de la caché.

    Args:
        key: Clave lógica.

    Returns:
        ``True`` si la clave existía y fue eliminada, ``False`` en caso contrario.
    """
    client = get_redis()
    result = await client.delete(f"{_CACHE_PREFIX}{key}")
    return result > 0


# ── Blacklist de JWT ─────────────────────────────────────────────


def _token_hash(token: str) -> str:
    """
    Genera un hash SHA-256 del token para no almacenar el JWT
    completo en Redis (buena práctica de seguridad).
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def add_to_blacklist(token: str, ttl: int) -> None:
    """
    Agrega un token JWT a la lista negra (logout / revocación).

    El token se almacena hasheado y con un TTL igual al tiempo
    restante de expiración del token, de modo que se auto-limpia.

    Args:
        token: JWT completo.
        ttl: Tiempo de vida en segundos (debe coincidir con el
            tiempo restante de expiración del token).
    """
    client = get_redis()
    hashed = _token_hash(token)
    await client.set(f"{_BLACKLIST_PREFIX}{hashed}", "1", ex=ttl)


async def is_blacklisted(token: str) -> bool:
    """
    Verifica si un token JWT ha sido revocado.

    Args:
        token: JWT completo.

    Returns:
        ``True`` si el token está en la lista negra.
    """
    client = get_redis()
    hashed = _token_hash(token)
    result = await client.get(f"{_BLACKLIST_PREFIX}{hashed}")
    return result is not None
