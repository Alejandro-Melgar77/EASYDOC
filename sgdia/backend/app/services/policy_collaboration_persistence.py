"""Durable, validated persistence for real-time UML policy operations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError
from pymongo import ReturnDocument

from app.core.database import get_database
from app.schemas.policies import (
    DiagramDefinition,
    PolicyFormDefinition,
    UmlEdge,
    UmlLane,
    UmlNode,
)
from app.services.policy_service import PolicyNotFoundError


class CollaborationOperationRejectedError(ValueError):
    """Raised when a WebSocket change would make a policy invalid."""


class CollaborationOperationConflictError(RuntimeError):
    """Raised when concurrent persistence retries cannot be reconciled."""


class PolicyCollaborationPersistenceService:
    """Apply one normalized editor operation without changing publication version.

    The published policy version represents intentional policy revisions. The
    collaboration revision instead tracks the smaller durable editor operations
    that are acknowledged through the WebSocket room.
    """

    _MAX_WRITE_RETRIES = 3

    def __init__(self, database: AsyncIOMotorDatabase | None = None) -> None:
        self._database = database

    @property
    def _db(self) -> AsyncIOMotorDatabase:
        return self._database if self._database is not None else get_database()

    async def apply(
        self,
        policy_id: str,
        operation: str,
        payload: dict[str, Any],
        actor_id: str,
        client_operation_id: str | None = None,
    ) -> dict[str, Any]:
        """Validate and atomically persist an editor operation.

        The comparison against ``updated_at`` prevents a stale diagram snapshot
        from silently overwriting another editor's operation. A small retry
        window lets two independent operations converge naturally.
        """
        policy_filter = self._policy_filter(policy_id)
        policies = self._db["policies"]

        for _attempt in range(self._MAX_WRITE_RETRIES):
            current = await policies.find_one({**policy_filter, "is_deleted": {"$ne": True}})
            if current is None:
                raise PolicyNotFoundError

            diagram, form = self._apply_operation(current, operation, payload)
            now = datetime.now(UTC)
            updated = await policies.find_one_and_update(
                {
                    **policy_filter,
                    "is_deleted": {"$ne": True},
                    "updated_at": current["updated_at"],
                },
                {
                    "$set": {
                        "diagram_data": diagram.model_dump(by_alias=True),
                        "form_definition": form.model_dump(by_alias=True),
                        "updated_at": now,
                        "last_collaboration_at": now,
                        "last_collaboration_by": actor_id,
                    },
                    "$inc": {"collaboration_revision": 1},
                },
                return_document=ReturnDocument.AFTER,
            )
            if updated is not None:
                return {
                    "revision": int(updated.get("collaboration_revision", 1)),
                    "updated_at": updated["updated_at"],
                    "operation": operation,
                    "client_operation_id": client_operation_id,
                }

        raise CollaborationOperationConflictError

    @staticmethod
    def _policy_filter(policy_id: str) -> dict[str, ObjectId]:
        if not ObjectId.is_valid(policy_id):
            raise PolicyNotFoundError
        return {"_id": ObjectId(policy_id)}

    def _apply_operation(
        self, current: dict[str, Any], operation: str, payload: dict[str, Any]
    ) -> tuple[DiagramDefinition, PolicyFormDefinition]:
        try:
            diagram = DiagramDefinition.model_validate(current.get("diagram_data", {}))
            form = PolicyFormDefinition.model_validate(
                current.get("form_definition", {"questions": [], "attachments": []})
            )

            if operation == "node.create":
                node = self._node_from_payload(payload)
                self._ensure_absent((item.id for item in diagram.nodes), node.id, "nodo")
                diagram = diagram.model_copy(update={"nodes": [*diagram.nodes, node]})
            elif operation == "node.update":
                node = self._node_from_payload(payload)
                self._ensure_present((item.id for item in diagram.nodes), node.id, "nodo")
                diagram = diagram.model_copy(
                    update={
                        "nodes": [item if item.id != node.id else node for item in diagram.nodes]
                    }
                )
            elif operation == "node.delete":
                node_id = self._id_from_payload(payload)
                self._ensure_present((item.id for item in diagram.nodes), node_id, "nodo")
                diagram = diagram.model_copy(
                    update={
                        "nodes": [item for item in diagram.nodes if item.id != node_id],
                        "edges": [
                            edge
                            for edge in diagram.edges
                            if edge.source != node_id and edge.target != node_id
                        ],
                    }
                )
            elif operation == "edge.create":
                edge = self._edge_from_payload(payload)
                self._ensure_absent((item.id for item in diagram.edges), edge.id, "conexion")
                diagram = diagram.model_copy(update={"edges": [*diagram.edges, edge]})
            elif operation == "edge.update":
                edge = self._edge_from_payload(payload)
                self._ensure_present((item.id for item in diagram.edges), edge.id, "conexion")
                diagram = diagram.model_copy(
                    update={
                        "edges": [item if item.id != edge.id else edge for item in diagram.edges]
                    }
                )
            elif operation == "edge.delete":
                edge_id = self._id_from_payload(payload)
                self._ensure_present((item.id for item in diagram.edges), edge_id, "conexion")
                diagram = diagram.model_copy(
                    update={"edges": [item for item in diagram.edges if item.id != edge_id]}
                )
            elif operation == "lane.create":
                lane = self._lane_from_payload(payload)
                self._ensure_absent((item.id for item in diagram.lanes), lane.id, "carril")
                diagram = diagram.model_copy(update={"lanes": [*diagram.lanes, lane]})
            elif operation == "lane.update":
                lane = self._lane_from_payload(payload)
                self._ensure_present((item.id for item in diagram.lanes), lane.id, "carril")
                diagram = diagram.model_copy(
                    update={
                        "lanes": [item if item.id != lane.id else lane for item in diagram.lanes],
                        "nodes": [
                            item.model_copy(update={"department": lane.name})
                            if item.lane_id == lane.id
                            else item
                            for item in diagram.nodes
                        ],
                    }
                )
            elif operation == "lane.delete":
                lane_id = self._id_from_payload(payload)
                self._ensure_present((item.id for item in diagram.lanes), lane_id, "carril")
                if len(diagram.lanes) <= 1:
                    raise CollaborationOperationRejectedError(
                        "El diagrama debe conservar al menos un carril de responsabilidad."
                    )
                fallback = next(item for item in diagram.lanes if item.id != lane_id)
                diagram = diagram.model_copy(
                    update={
                        "lanes": [item for item in diagram.lanes if item.id != lane_id],
                        "nodes": [
                            item.model_copy(
                                update={"lane_id": fallback.id, "department": fallback.name}
                            )
                            if item.lane_id == lane_id
                            else item
                            for item in diagram.nodes
                        ],
                    }
                )
            elif operation == "form.update":
                raw_form = payload.get("form")
                if not isinstance(raw_form, dict):
                    raise CollaborationOperationRejectedError(
                        "El formulario colaborativo no es valido."
                    )
                form = PolicyFormDefinition.model_validate(raw_form)
            else:
                raise CollaborationOperationRejectedError(
                    "La operacion colaborativa no esta permitida."
                )

            # Re-validation catches duplicate IDs, dangling edges, and lane references.
            return (
                DiagramDefinition.model_validate(diagram.model_dump(by_alias=True)),
                PolicyFormDefinition.model_validate(form.model_dump(by_alias=True)),
            )
        except ValidationError as exc:
            raise CollaborationOperationRejectedError(
                "La operacion no cumple el contrato UML."
            ) from exc

    @staticmethod
    def _node_from_payload(payload: dict[str, Any]) -> UmlNode:
        raw_node = payload.get("node")
        if not isinstance(raw_node, dict):
            raise CollaborationOperationRejectedError("El nodo colaborativo no es valido.")
        return UmlNode.model_validate(raw_node)

    @staticmethod
    def _edge_from_payload(payload: dict[str, Any]) -> UmlEdge:
        raw_edge = payload.get("edge")
        if not isinstance(raw_edge, dict):
            raise CollaborationOperationRejectedError("La conexion colaborativa no es valida.")
        return UmlEdge.model_validate(raw_edge)

    @staticmethod
    def _lane_from_payload(payload: dict[str, Any]) -> UmlLane:
        raw_lane = payload.get("lane")
        if not isinstance(raw_lane, dict):
            raise CollaborationOperationRejectedError("El carril colaborativo no es valido.")
        return UmlLane.model_validate(raw_lane)

    @staticmethod
    def _id_from_payload(payload: dict[str, Any]) -> str:
        identifier = payload.get("id")
        if not isinstance(identifier, str) or not identifier.strip():
            raise CollaborationOperationRejectedError(
                "La operacion no incluye un identificador valido."
            )
        return identifier.strip()

    @staticmethod
    def _ensure_present(identifiers: Any, identifier: str, element_name: str) -> None:
        if identifier not in set(identifiers):
            raise CollaborationOperationRejectedError(
                f"El {element_name} ya no existe en el diagrama."
            )

    @staticmethod
    def _ensure_absent(identifiers: Any, identifier: str, element_name: str) -> None:
        if identifier in set(identifiers):
            raise CollaborationOperationRejectedError(
                f"El {element_name} ya existe en el diagrama."
            )
