import asyncio
import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.websocket_auth import authenticate_websocket, has_permissions
from app.services.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/agent", tags=["WebSocket Agente IA"])
rag_engine = RAGEngine()


@router.websocket("/chat")
async def websocket_agent_endpoint(websocket: WebSocket, token: str = Query(...)):
    """WebSocket para streaming de respuestas de la IA en tiempo real"""
    payload = await authenticate_websocket(websocket, token)
    if payload is None or not has_permissions(payload, "agent:use"):
        if payload is not None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await websocket.accept()
    user_id = payload["sub"]

    try:
        while True:
            data = await websocket.receive_text()
            try:
                request_data = json.loads(data)
                query = request_data.get("query", "")

                if query:
                    # Send initial "thinking" message
                    await websocket.send_json({"type": "status", "content": "Pensando..."})

                    # In a real implementation, generate_response would return an async generator
                    # For this mock, we'll simulate token streaming
                    response, sources = await rag_engine.query(query)

                    tokens = response.split(" ")
                    for i, token in enumerate(tokens):
                        await websocket.send_json(
                            {
                                "type": "chunk",
                                "content": token + (" " if i < len(tokens) - 1 else ""),
                            }
                        )
                        await asyncio.sleep(0.05)  # Simulate streaming delay

                    # Send completion message with sources
                    await websocket.send_json({"type": "done", "sources": sources})

            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format"})
    except WebSocketDisconnect:
        logger.info(f"Agent websocket disconnected for user {user_id}")
