"""Authenticated real-time collaboration channel for stored documents."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.websocket_auth import authenticate_websocket, has_permissions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws/collaboration", tags=["WebSocket Collaboration"])


class ConnectionManager:
    """Keep document rooms in memory for the single development backend."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[dict[str, Any]]] = {}

    async def connect(self, websocket: WebSocket, document_id: str, user_id: str) -> None:
        await websocket.accept()
        self.active_connections.setdefault(document_id, []).append(
            {"websocket": websocket, "user_id": user_id}
        )
        await self.broadcast(
            document_id, {"type": "presence", "action": "join", "user_id": user_id}
        )

    async def disconnect(self, websocket: WebSocket, document_id: str, user_id: str) -> None:
        room = self.active_connections.get(document_id, [])
        remaining = [item for item in room if item["websocket"] is not websocket]
        if remaining:
            self.active_connections[document_id] = remaining
        else:
            self.active_connections.pop(document_id, None)
        await self.broadcast(
            document_id, {"type": "presence", "action": "leave", "user_id": user_id}
        )

    async def broadcast(
        self,
        document_id: str,
        message: dict[str, Any],
        excluded_socket: WebSocket | None = None,
    ) -> None:
        for item in tuple(self.active_connections.get(document_id, [])):
            socket = item["websocket"]
            if socket is excluded_socket:
                continue
            try:
                await socket.send_json(message)
            except Exception:
                logger.info("Closing unavailable document collaboration socket", exc_info=True)


manager = ConnectionManager()


@router.websocket("/{document_id}")
async def websocket_endpoint(
    websocket: WebSocket, document_id: str, token: str = Query(..., min_length=1)
) -> None:
    """Synchronize document editor events between real authorized sessions only."""
    payload = await authenticate_websocket(websocket, token)
    if payload is None or not has_permissions(payload, "documents:read"):
        if payload is not None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload["sub"]
    await manager.connect(websocket, document_id, user_id)
    try:
        while True:
            try:
                message = json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "code": "invalid_json"})
                continue

            if not isinstance(message, dict):
                await websocket.send_json({"type": "error", "code": "invalid_message"})
                continue
            message["actor_id"] = user_id
            await manager.broadcast(document_id, message, excluded_socket=websocket)
    except WebSocketDisconnect:
        await manager.disconnect(websocket, document_id, user_id)
