"""Canal WebSocket aislado para edicion colaborativa de politicas UML."""

from __future__ import annotations

import logging
from enum import Enum
from typing import Any, Literal

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.websocket_auth import authenticate_websocket, has_permissions
from app.services.audit_service import AuditService
from app.services.policy_collaboration import policy_collaboration_manager
from app.services.policy_collaboration_persistence import (
    CollaborationOperationConflictError,
    CollaborationOperationRejectedError,
    PolicyCollaborationPersistenceService,
)
from app.services.policy_service import PolicyNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/policy-collaboration", tags=["WebSocket Politicas"])
policy_collaboration_persistence = PolicyCollaborationPersistenceService()


class PolicyOperation(str, Enum):
    """Operaciones de colaboracion que el diagramador puede sincronizar."""

    NODE_CREATE = "node.create"
    NODE_UPDATE = "node.update"
    NODE_DELETE = "node.delete"
    EDGE_CREATE = "edge.create"
    EDGE_UPDATE = "edge.update"
    EDGE_DELETE = "edge.delete"
    LANE_CREATE = "lane.create"
    LANE_UPDATE = "lane.update"
    LANE_DELETE = "lane.delete"
    FORM_UPDATE = "form.update"


class PolicyOperationMessage(BaseModel):
    """Mensaje que el cliente emite al modificar un diagrama o formulario."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["operation"]
    operation: PolicyOperation
    payload: dict[str, Any]
    client_operation_id: str | None = None


@router.websocket("/{policy_id}")
async def policy_collaboration_websocket(
    websocket: WebSocket,
    policy_id: str,
    token: str = Query(..., min_length=1),
) -> None:
    """Sincroniza cambios UML y de formulario entre sesiones reales autorizadas.

    Cada operacion se valida y persiste antes de retransmitirse. Esto evita que
    una recarga, caida del navegador o reconexion descarte cambios ya visibles
    para otros editores.
    """
    payload = await authenticate_websocket(websocket, token)
    if payload is None or not has_permissions(payload, "policies:write"):
        if payload is not None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = payload["sub"]

    await policy_collaboration_manager.connect(websocket, policy_id, user_id)
    try:
        while True:
            raw_message = await websocket.receive_json()
            if raw_message == {"type": "ping"}:
                await policy_collaboration_manager.touch(websocket, policy_id)
                await websocket.send_json({"type": "pong"})
                continue

            try:
                message = PolicyOperationMessage.model_validate(raw_message)
            except ValidationError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "invalid_operation",
                        "detail": "El mensaje no cumple el contrato de colaboracion.",
                    }
                )
                continue

            try:
                persisted = await policy_collaboration_persistence.apply(
                    policy_id=policy_id,
                    operation=message.operation.value,
                    payload=message.payload,
                    actor_id=user_id,
                    client_operation_id=message.client_operation_id,
                )
            except PolicyNotFoundError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "policy_not_found",
                        "detail": "La politica ya no esta disponible para edicion.",
                    }
                )
                continue
            except CollaborationOperationRejectedError as exc:
                await websocket.send_json(
                    {"type": "error", "code": "operation_rejected", "detail": str(exc)}
                )
                continue
            except CollaborationOperationConflictError:
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "operation_conflict",
                        "detail": "Otro editor actualizo el diagrama. Reintenta el cambio.",
                    }
                )
                continue

            await AuditService.log_action(
                user_id=user_id,
                action=AuditService.ACTIONS["POLICY_COLLABORATION_UPDATE"],
                entity_type="policy",
                entity_id=policy_id,
                details={
                    "operation": message.operation.value,
                    "revision": persisted["revision"],
                    "client_operation_id": message.client_operation_id,
                },
            )
            await websocket.send_json(
                {
                    "type": "persistence",
                    "revision": persisted["revision"],
                    "updated_at": persisted["updated_at"].isoformat(),
                    "client_operation_id": message.client_operation_id,
                }
            )

            await policy_collaboration_manager.broadcast_operation(
                policy_id=policy_id,
                operation=message.operation.value,
                payload=message.payload,
                actor_id=user_id,
                sender=websocket,
                client_operation_id=message.client_operation_id,
                revision=persisted["revision"],
            )
    except WebSocketDisconnect:
        logger.info(
            "Policy collaboration websocket disconnected: policy=%s user=%s", policy_id, user_id
        )
    finally:
        await policy_collaboration_manager.disconnect(websocket, policy_id)
