"""Persistence service for business policies and their version history."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.schemas.policies import PolicyCreate, PolicyUpdate


class PolicyNotFoundError(Exception):
    """Raised when a requested policy does not exist."""


class PolicyVersionConflictError(Exception):
    """Raised when a client tries to save over a newer policy revision."""


class PolicyAlreadyExistsError(Exception):
    """Raised when a policy title is already registered."""


class PolicyService:
    """MongoDB persistence for policies, diagrams, forms, and snapshots."""

    def __init__(self, database: AsyncIOMotorDatabase | None = None) -> None:
        self._database = database

    @property
    def _db(self) -> AsyncIOMotorDatabase:
        return self._database if self._database is not None else get_database()

    async def create(
        self, data: PolicyCreate, created_by: str, initial_status: str = "draft"
    ) -> dict[str, Any]:
        """Create a draft policy together with its initial immutable snapshot."""
        policies = self._db["policies"]
        versions = self._db["policy_versions"]

        if await policies.find_one({"title": data.title}):
            raise PolicyAlreadyExistsError
        if initial_status == "published":
            self._validate_publishable_diagram(data.diagram_data.model_dump(by_alias=True))

        now = datetime.now(UTC)
        policy = {
            "title": data.title,
            "description": data.description,
            "diagram_data": data.diagram_data.model_dump(by_alias=True),
            "form_definition": data.form_definition.model_dump(by_alias=True),
            "status": initial_status,
            "version": 1,
            "collaboration_revision": 0,
            "created_by": created_by,
            "created_at": now,
            "updated_at": now,
        }

        try:
            result = await policies.insert_one(policy)
        except DuplicateKeyError as exc:
            raise PolicyAlreadyExistsError from exc

        policy["_id"] = result.inserted_id
        try:
            await versions.insert_one(self._version_snapshot(policy, "Initial creation"))
        except Exception:
            # Compensate the first write if its corresponding history could not be stored.
            await policies.delete_one({"_id": result.inserted_id})
            raise

        return self._serialize(policy)

    async def list(self, page: int, page_size: int, status: str | None = None) -> dict[str, Any]:
        """Return policies ordered by their most recent update."""
        policies = self._db["policies"]
        query: dict[str, Any] = {"is_deleted": {"$ne": True}}
        if status:
            query["status"] = status

        total = await policies.count_documents(query)
        cursor = (
            policies.find(query)
            .sort("updated_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        items = [self._serialize(policy) async for policy in cursor]
        return {"policies": items, "total": total, "page": page, "page_size": page_size}

    async def get(self, policy_id: str) -> dict[str, Any]:
        """Load one policy by identifier."""
        policy = await self._db["policies"].find_one(self._policy_filter(policy_id))
        if not policy:
            raise PolicyNotFoundError
        return self._serialize(policy)

    async def update(self, policy_id: str, data: PolicyUpdate, updated_by: str) -> dict[str, Any]:
        """Apply an update and store a new full snapshot with an incremented version."""
        changes = data.model_dump(
            by_alias=True,
            exclude_unset=True,
            exclude={"expected_version", "change_summary"},
        )
        if not changes:
            raise ValueError("No data to update")

        if "diagram_data" in changes:
            changes["diagram_data"] = data.diagram_data.model_dump(by_alias=True)
        if "form_definition" in changes:
            changes["form_definition"] = data.form_definition.model_dump(by_alias=True)

        next_status = changes.get("status")
        if next_status == "published":
            current = await self._db["policies"].find_one(self._policy_filter(policy_id))
            if current is None:
                raise PolicyNotFoundError
            diagram = changes.get("diagram_data", current["diagram_data"])
            self._validate_publishable_diagram(diagram)

        changes["updated_at"] = datetime.now(UTC)
        query = self._policy_filter(policy_id)
        if data.expected_version is not None:
            query["version"] = data.expected_version

        policy = await self._db["policies"].find_one_and_update(
            query,
            {"$set": changes, "$inc": {"version": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if not policy:
            if data.expected_version is not None and await self._exists(policy_id):
                raise PolicyVersionConflictError
            raise PolicyNotFoundError

        await self._db["policy_versions"].insert_one(
            self._version_snapshot(
                policy,
                data.change_summary or self._default_change_summary(changes),
                created_by=updated_by,
            )
        )
        return self._serialize(policy)

    async def _exists(self, policy_id: str) -> bool:
        return bool(await self._db["policies"].find_one(self._policy_filter(policy_id)))

    @staticmethod
    def _policy_filter(policy_id: str) -> dict[str, ObjectId]:
        if not ObjectId.is_valid(policy_id):
            raise PolicyNotFoundError
        return {"_id": ObjectId(policy_id)}

    @staticmethod
    def _serialize(policy: dict[str, Any]) -> dict[str, Any]:
        serialized = dict(policy)
        serialized["id"] = str(serialized.pop("_id"))
        serialized.setdefault("form_definition", {"questions": [], "attachments": []})
        return serialized

    @staticmethod
    def _version_snapshot(
        policy: dict[str, Any], change_summary: str, created_by: str | None = None
    ) -> dict[str, Any]:
        return {
            "policy_id": str(policy["_id"]),
            "version": policy["version"],
            "title": policy["title"],
            "description": policy.get("description"),
            "diagram_data": policy["diagram_data"],
            "form_definition": policy.get("form_definition", {"questions": [], "attachments": []}),
            "status": policy["status"],
            "created_by": created_by or policy["created_by"],
            "created_at": datetime.now(UTC),
            "change_summary": change_summary,
        }

    @staticmethod
    def _default_change_summary(changes: dict[str, Any]) -> str:
        changed_fields = ", ".join(sorted(key for key in changes if key != "updated_at"))
        return f"Updated {changed_fields}" if changed_fields else "Updated policy"

    @staticmethod
    def _validate_publishable_diagram(diagram: dict[str, Any]) -> None:
        """Enforce the essential UML activity semantics when a policy becomes usable."""
        nodes = {str(node.get("id")): node for node in diagram.get("nodes", [])}
        edges = diagram.get("edges", [])
        starts = [node_id for node_id, node in nodes.items() if node.get("type") == "start"]
        ends = {
            node_id for node_id, node in nodes.items() if node.get("type") in {"end", "flowFinal"}
        }
        if len(starts) != 1 or not ends:
            raise ValueError(
                "Una politica publicada requiere un unico nodo inicial y al menos un nodo final"
            )

        outgoing: dict[str, list[str]] = {}
        incoming: dict[str, list[str]] = {}
        for edge in edges:
            source = str(edge.get("from", edge.get("source", "")))
            target = str(edge.get("to", edge.get("target", "")))
            outgoing.setdefault(source, []).append(target)
            incoming.setdefault(target, []).append(source)

        visited: set[str] = set()
        stack = [starts[0]]
        while stack:
            node_id = stack.pop()
            if node_id in visited:
                continue
            visited.add(node_id)
            stack.extend(outgoing.get(node_id, []))
        if not visited & ends:
            raise ValueError("El flujo de control debe conectar Inicio con un nodo final")

        for node_id, node in nodes.items():
            node_type = node.get("type")
            inputs = len(incoming.get(node_id, []))
            outputs = len(outgoing.get(node_id, []))
            if node_type == "fork" and (inputs != 1 or outputs < 2):
                raise ValueError("Fork debe tener una entrada y al menos dos salidas de control")
            if node_type == "join" and (inputs < 2 or outputs != 1):
                raise ValueError(
                    "Join debe tener al menos dos entradas y una sola salida de control"
                )
