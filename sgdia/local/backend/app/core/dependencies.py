"""
sgdia/backend/app/core/dependencies.py

Dependencias de FastAPI para autenticación y autorización.

Proporciona inyección de dependencias reutilizables para:
- Extraer y validar el usuario actual desde el token JWT
- Verificar que el usuario esté activo
- Exigir permisos específicos (RBAC)
- Exigir roles específicos

Uso en endpoints:
    @router.get("/recurso")
    async def obtener_recurso(
        user: dict = Depends(get_current_active_user),
    ):
        ...

    @router.delete("/recurso/{id}", dependencies=[Depends(require_roles("Administrador"))])
    async def eliminar_recurso(id: str):
        ...
"""

from collections.abc import Callable
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.redis import is_blacklisted
from app.core.security import (
    InvalidTokenError,
    TokenExpiredError,
    decode_jwt,
)

# ── OAuth2 scheme ────────────────────────────────────────────────
# tokenUrl apunta al endpoint de login (se definirá en el router de auth)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Dependencia: usuario actual ──────────────────────────────────


async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> dict[str, Any]:
    """
    Extrae y valida el usuario actual a partir del token JWT.

    Proceso:
    1. Verifica que el token no esté en la blacklist de Redis.
    2. Decodifica el JWT y valida firma + expiración.
    3. Verifica que sea un token de tipo 'access'.
    4. Retorna el payload del token con los datos del usuario.

    Args:
        token: Token JWT extraído automáticamente del header
            ``Authorization: Bearer <token>``.

    Returns:
        Diccionario con los datos del usuario extraídos del JWT:
        ``sub``, ``roles``, ``permissions``, ``type``, etc.

    Raises:
        HTTPException 401: Si el token es inválido, expirado,
            revocado o no es de tipo 'access'.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Verificar blacklist en Redis
    if await is_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha sido revocado (sesión cerrada)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Decodificar JWT
    try:
        payload = decode_jwt(token)
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token ha expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Validar que sea un access token
    if payload.get("type") != "access":
        raise credentials_exception

    # 4. Validar que contenga un subject (user_id)
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    return payload


# ── Dependencia: usuario activo ──────────────────────────────────


async def get_current_active_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Verifica que el usuario actual esté activo (no deshabilitado).

    Comprueba el campo ``is_active`` del payload del JWT. Si el campo
    no está presente, se asume que el usuario está activo (por
    compatibilidad con tokens emitidos sin ese campo).

    Args:
        current_user: Payload del JWT obtenido de ``get_current_user``.

    Returns:
        El mismo diccionario del usuario si está activo.

    Raises:
        HTTPException 403: Si el usuario está deshabilitado.
    """
    # El campo is_active se incluye opcionalmente en el payload del JWT
    # o puede verificarse contra la base de datos en implementaciones más estrictas
    if current_user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta del usuario está deshabilitada",
        )
    return current_user


# ── Dependencia: verificación de permisos ────────────────────────


def require_permissions(*required_permissions: str) -> Callable:
    """
    Crea una dependencia que verifica si el usuario posee
    todos los permisos requeridos.

    Los permisos se almacenan en el JWT como una lista de strings
    con formato ``"module:action"`` (ej: ``"documents:write"``).

    Args:
        *required_permissions: Uno o más permisos requeridos.
            Ejemplo: ``require_permissions("documents:read", "documents:write")``

    Returns:
        Dependencia de FastAPI inyectable con ``Depends()``.

    Raises:
        HTTPException 403: Si el usuario no posee alguno de los
            permisos requeridos.

    Example:
        >>> @router.post(
        ...     "/documents",
        ...     dependencies=[Depends(require_permissions("documents:write"))],
        ... )
        ... async def create_document(...):
        ...     ...
    """

    async def _permission_checker(
        current_user: dict[str, Any] = Depends(get_current_active_user),
    ) -> dict[str, Any]:
        user_permissions: list[str] = current_user.get("permissions", [])

        missing = [perm for perm in required_permissions if perm not in user_permissions]

        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(f"Permisos insuficientes. Se requieren: {', '.join(missing)}"),
            )

        return current_user

    return _permission_checker


# ── Dependencia: verificación de roles ───────────────────────────


def require_roles(*required_roles: str) -> Callable:
    """
    Crea una dependencia que verifica si el usuario tiene
    al menos uno de los roles requeridos.

    A diferencia de ``require_permissions`` (que exige **todos** los
    permisos), ``require_roles`` permite el acceso si el usuario
    posee **al menos uno** de los roles especificados.

    Args:
        *required_roles: Uno o más roles aceptados.
            Ejemplo: ``require_roles("Administrador", "Analista")``

    Returns:
        Dependencia de FastAPI inyectable con ``Depends()``.

    Raises:
        HTTPException 403: Si el usuario no posee ninguno de los
            roles requeridos.

    Example:
        >>> @router.delete(
        ...     "/users/{user_id}",
        ...     dependencies=[Depends(require_roles("Administrador"))],
        ... )
        ... async def delete_user(user_id: str):
        ...     ...
    """

    async def _role_checker(
        current_user: dict[str, Any] = Depends(get_current_active_user),
    ) -> dict[str, Any]:
        user_roles: list[str] = current_user.get("roles", [])

        # Basta con tener al menos uno de los roles requeridos
        has_required_role = any(role in user_roles for role in required_roles)

        if not has_required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(f"Rol insuficiente. Se requiere uno de: {', '.join(required_roles)}"),
            )

        return current_user

    return _role_checker
