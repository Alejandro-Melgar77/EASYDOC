"""
sgdia/backend/app/core/security.py

Utilidades de seguridad para el sistema SGDIA.

- Hashing y verificación de contraseñas (bcrypt via passlib)
- Creación y decodificación de tokens JWT (PyJWT)

Todas las funciones son síncronas ya que las operaciones criptográficas
son CPU-bound y PyJWT no ofrece API asíncrona.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

# ── Contexto de hashing ─────────────────────────────────────────
# Se usa bcrypt como esquema principal; auto-deprecated permite
# migrar contraseñas hasheadas con esquemas anteriores.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Genera un hash bcrypt de la contraseña proporcionada.

    Args:
        password: Contraseña en texto plano.

    Returns:
        Hash bcrypt listo para almacenar en la base de datos.

    Example:
        >>> hashed = hash_password("mi_contraseña_segura")
        >>> hashed.startswith("$2b$")
        True
    """
    return _pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica que una contraseña en texto plano coincida con su hash bcrypt.

    Args:
        plain_password: Contraseña proporcionada por el usuario.
        hashed_password: Hash almacenado en la base de datos.

    Returns:
        ``True`` si la contraseña coincide, ``False`` en caso contrario.
    """
    return _pwd_context.verify(plain_password, hashed_password)


# ── Creación de tokens JWT ───────────────────────────────────────


def _build_payload(
    data: dict[str, Any],
    token_type: str,
    expires_delta: timedelta,
) -> dict[str, Any]:
    """
    Construye el payload base para un token JWT.

    Args:
        data: Datos del usuario (debe incluir 'sub' con el user_id).
        token_type: Tipo de token ('access' o 'refresh').
        expires_delta: Duración de validez del token.

    Returns:
        Diccionario con el payload completo incluyendo
        sub, roles, permissions, exp, iat y type.
    """
    now = datetime.now(tz=UTC)

    payload: dict[str, Any] = {
        "sub": data.get("sub"),
        "roles": data.get("roles", []),
        "permissions": data.get("permissions", []),
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    }

    # Incluir campos adicionales pasados en data (ej: email, name)
    for key, value in data.items():
        if key not in payload:
            payload[key] = value

    return payload


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Crea un token JWT de acceso.

    Args:
        data: Datos a incluir en el payload. Debe contener al menos:
            - ``sub``: ID del usuario (str).
            - ``roles``: Lista de nombres de rol (opcional).
            - ``permissions``: Lista de permisos (opcional).
        expires_delta: Duración personalizada. Si es ``None`` se usa
            ``JWT_ACCESS_TOKEN_EXPIRE_MINUTES`` de la configuración.

    Returns:
        Token JWT codificado como string.
    """
    settings = get_settings()

    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = _build_payload(data, token_type="access", expires_delta=expires_delta)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Crea un token JWT de refresco con mayor duración.

    El refresh token se utiliza para obtener nuevos access tokens
    sin requerir que el usuario ingrese sus credenciales nuevamente.

    Args:
        data: Datos a incluir en el payload (misma estructura que
            ``create_access_token``).

    Returns:
        Token JWT de tipo 'refresh' codificado como string.
    """
    settings = get_settings()

    expires_delta = timedelta(minutes=settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES)
    payload = _build_payload(data, token_type="refresh", expires_delta=expires_delta)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


# ── Decodificación y validación ──────────────────────────────────


class TokenError(Exception):
    """Excepción base para errores relacionados con tokens JWT."""

    def __init__(self, detail: str = "Token inválido"):
        self.detail = detail
        super().__init__(self.detail)


class TokenExpiredError(TokenError):
    """El token JWT ha expirado."""

    def __init__(self):
        super().__init__(detail="El token ha expirado")


class InvalidTokenError(TokenError):
    """El token JWT es inválido o no se puede decodificar."""

    def __init__(self, detail: str = "Token inválido o malformado"):
        super().__init__(detail=detail)


def decode_jwt(token: str) -> dict[str, Any]:
    """
    Decodifica y valida un token JWT.

    Realiza las siguientes validaciones:
    - Firma válida (contra JWT_SECRET_KEY)
    - Algoritmo correcto (JWT_ALGORITHM)
    - Token no expirado (campo ``exp``)

    Args:
        token: Token JWT codificado.

    Returns:
        Payload decodificado como diccionario.

    Raises:
        TokenExpiredError: Si el token ha expirado.
        InvalidTokenError: Si el token es inválido, malformado o
            la firma no coincide.
    """
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "type"]},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise TokenExpiredError()

    except jwt.InvalidTokenError as exc:
        raise InvalidTokenError(detail=f"Token inválido: {exc}")
