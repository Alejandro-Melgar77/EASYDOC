import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.websocket_auth import authenticate_websocket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/notifications", tags=["WebSocket Notificaciones"])


class NotificationConnectionManager:
    """
    Mantiene un mapa user_id → lista de WebSockets activos.
    Al recibir una notificación in-app, el NotificationService puede usar
    este manager para hacer push en tiempo real.
    """

    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.connections.setdefault(user_id, []).append(websocket)
        logger.info("WS notification connected: user=%s", user_id)

    def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self.connections.get(user_id, [])
        self.connections[user_id] = [ws for ws in conns if ws != websocket]

    async def push_to_user(self, user_id: str, payload: dict):
        """Envía un mensaje JSON a todas las conexiones activas del usuario."""
        for ws in self.connections.get(user_id, []):
            try:
                await ws.send_json(payload)
            except Exception as exc:
                logger.error("Error pushing to user %s: %s", user_id, exc)


# Singleton accesible desde el NotificationService
notification_manager = NotificationConnectionManager()


@router.websocket("")
async def notifications_ws(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    CU-37: Canal WebSocket para notificaciones push en tiempo real.
    El cliente se conecta con su token JWT y espera mensajes del servidor.
    """
    payload = await authenticate_websocket(websocket, token)
    if payload is None:
        return
    user_id = payload["sub"]
    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            # Mantener conexión viva; el servidor es quien empuja
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket, user_id)
        logger.info("WS notification disconnected: user=%s", user_id)
