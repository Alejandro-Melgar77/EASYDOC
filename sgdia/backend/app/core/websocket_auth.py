"""Reusable JWT validation for browser and mobile WebSocket endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import WebSocket, status

from app.core.redis import is_blacklisted
from app.core.security import InvalidTokenError, TokenExpiredError, decode_jwt


async def authenticate_websocket(websocket: WebSocket, token: str) -> dict[str, Any] | None:
    """Return a valid access-token payload or close the socket with policy violation."""
    try:
        if await is_blacklisted(token):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return None
        payload = decode_jwt(token)
    except (InvalidTokenError, TokenExpiredError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None

    user_id = payload.get("sub")
    if payload.get("type") != "access" or not isinstance(user_id, str) or not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return None
    return payload


def has_permissions(payload: dict[str, Any], *permissions: str) -> bool:
    """Validate every required permission stored in the signed JWT payload."""
    user_permissions = payload.get("permissions", [])
    return isinstance(user_permissions, list) and all(
        item in user_permissions for item in permissions
    )
