"""Persistence and progression for account-free academic service requests."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.schemas.requests import GuestRequestCreate, TaskStatusUpdate


class RequestNotFoundError(Exception):
    """Raised when a tracking code or internal request identifier is unknown."""


class RequestAccessDeniedError(Exception):
    """Raised when the receipt PIN does not match a guest request."""


class TaskNotFoundError(Exception):
    """Raised when an assigned staff task does not exist."""


class TaskAccessDeniedError(Exception):
    """Raised when a staff member attempts to update another task."""


class RequestService:
    """Creates requests from a published policy and advances their UML path."""

    def __init__(self, database: AsyncIOMotorDatabase | None = None) -> None:
        self._database = database

    @property
    def _db(self) -> AsyncIOMotorDatabase:
        return self._database or get_database()

    async def list_public_services(self) -> list[dict[str, Any]]:
        cursor = (
            self._db["policies"]
            .find(
                {"status": "published", "is_deleted": {"$ne": True}},
                {"title": 1, "description": 1, "form_definition": 1},
            )
            .sort("title", 1)
        )
        return [
            {
                "id": str(policy["_id"]),
                "title": policy["title"],
                "description": policy.get("description"),
                "form_definition": policy.get(
                    "form_definition", {"questions": [], "attachments": []}
                ),
            }
            async for policy in cursor
        ]

    async def public_service(self, policy_id: str) -> dict[str, Any]:
        policy = await self._published_policy(policy_id)
        return {
            "id": str(policy["_id"]),
            "title": policy["title"],
            "description": policy.get("description"),
            "form_definition": policy.get("form_definition", {"questions": [], "attachments": []}),
        }

    async def create_request(self, policy_id: str, data: GuestRequestCreate) -> dict[str, Any]:
        policy = await self._published_policy(policy_id)
        self._validate_answers(policy.get("form_definition", {}), data.answers)

        now = datetime.now(UTC)
        tracking_code = self._tracking_code()
        receipt_pin = f"{secrets.randbelow(100_000_000):08d}"
        graph = self._graph(policy)
        initial_node = self._first_executable_node(graph)
        initial_stage = self._stage_from_node(graph, initial_node)
        required_attachment_ids = self._required_attachment_ids(policy.get("form_definition", {}))
        intake_ready = not required_attachment_ids
        pending_stage = {
            "id": "documents-pending",
            "label": "Pendiente de documentos",
            "department": None,
            "assignee_id": None,
        }
        request = {
            "policy_id": str(policy["_id"]),
            "service_title": policy["title"],
            "tracking_code": tracking_code,
            "receipt_pin_hash": self._hash_pin(receipt_pin),
            "applicant": data.applicant.model_dump(),
            "answers": data.answers,
            "attachments": [],
            "status": "received",
            "priority": data.priority,
            "intake_ready": intake_ready,
            "current_node_id": initial_node.get("id") if intake_ready and initial_node else None,
            "current_stage": initial_stage if intake_ready else pending_stage,
            "active_node_ids": [initial_node["id"]] if intake_ready and initial_node else [],
            "active_stages": [initial_stage] if intake_ready and initial_stage else [],
            "completed_node_ids": [],
            "final_response": None,
            "is_fully_completed": False,
            "timeline": [
                {
                    "at": now,
                    "status": "received",
                    "detail": (
                        "Solicitud recibida y registrada."
                        if intake_ready
                        else "Solicitud registrada. Pendiente de documentos obligatorios."
                    ),
                    "actor_id": None,
                }
            ],
            "is_synthetic": False,
            "created_at": now,
            "updated_at": now,
        }
        inserted = await self._db["service_requests"].insert_one(request)
        request["_id"] = inserted.inserted_id

        if intake_ready and initial_node and initial_node.get("assignee"):
            await self._create_task(request, initial_node, now)
        return {
            "tracking_code": tracking_code,
            "receipt_pin": receipt_pin,
            "status": "received",
            "current_stage": (
                initial_stage.get("label")
                if intake_ready and initial_stage
                else pending_stage["label"]
            ),
        }

    async def request_for_tracking(self, tracking_code: str, receipt_pin: str) -> dict[str, Any]:
        request = await self._verified_request(tracking_code, receipt_pin)
        return self._tracking_response(request)

    async def add_attachment(
        self,
        tracking_code: str,
        receipt_pin: str,
        requirement_id: str,
        attachment: dict[str, Any],
    ) -> dict[str, Any]:
        request = await self._verified_request(tracking_code, receipt_pin)
        policy = await self._published_policy(request["policy_id"])
        requirement = next(
            (
                item
                for item in policy.get("form_definition", {}).get("attachments", [])
                if item.get("id") == requirement_id
            ),
            None,
        )
        if requirement is None:
            raise ValueError("El requisito no pertenece al tramite seleccionado")

        now = datetime.now(UTC)
        attachment["id"] = str(ObjectId())
        attachment["requirement_id"] = requirement_id
        attachment["uploaded_at"] = now
        attached_ids = {item.get("requirement_id") for item in request.get("attachments", [])} | {
            requirement_id
        }
        required_attachment_ids = self._required_attachment_ids(policy.get("form_definition", {}))
        intake_ready = request.get("intake_ready", True) or required_attachment_ids.issubset(
            attached_ids
        )
        updates: dict[str, Any] = {"updated_at": now}
        timeline_entry: dict[str, Any] | None = None

        if not request.get("intake_ready", True) and intake_ready:
            graph = self._graph(policy)
            initial_node = self._first_executable_node(graph)
            stage = self._stage_from_node(graph, initial_node)
            updates.update(
                {
                    "intake_ready": True,
                    "current_node_id": initial_node.get("id") if initial_node else None,
                    "current_stage": stage,
                    "active_node_ids": [initial_node["id"]] if initial_node else [],
                    "active_stages": [stage] if stage else [],
                }
            )
            timeline_entry = {
                "at": now,
                "status": "received",
                "detail": "Documentos obligatorios completos. Tramite enviado a recepcion.",
                "actor_id": None,
            }

        push: dict[str, Any] = {"attachments": attachment}
        if timeline_entry is not None:
            push["timeline"] = timeline_entry
        await self._db["service_requests"].update_one(
            {"_id": request["_id"]},
            {"$push": push, "$set": updates},
        )
        if timeline_entry is not None and initial_node and initial_node.get("assignee"):
            await self._create_task(request, initial_node, now)
        return attachment

    async def assigned_tasks(self, user_id: str) -> list[dict[str, Any]]:
        cursor = (
            self._db["workflow_tasks"]
            .find(
                {"assignee_id": user_id, "status": {"$nin": ["completed", "rejected", "discarded"]}}
            )
            .sort("updated_at", -1)
        )
        return [self._task_response(task) async for task in cursor]

    async def update_task(
        self, task_id: str, user_id: str, update: TaskStatusUpdate
    ) -> dict[str, Any]:
        if not ObjectId.is_valid(task_id):
            raise TaskNotFoundError
        task = await self._db["workflow_tasks"].find_one({"_id": ObjectId(task_id)})
        if task is None:
            raise TaskNotFoundError
        if task.get("assignee_id") != user_id:
            raise TaskAccessDeniedError

        now = datetime.now(UTC)
        request = await self._db["service_requests"].find_one({"_id": task["request_id"]})
        if request is None:
            raise RequestNotFoundError

        updates = {"status": update.status, "updated_at": now}
        if update.comment:
            updates["comment"] = update.comment
        await self._db["workflow_tasks"].update_one({"_id": task["_id"]}, {"$set": updates})

        detail = update.comment or f"Tarea '{task['title']}' actualizada a {update.status}."
        timeline_entry = {"at": now, "status": update.status, "detail": detail, "actor_id": user_id}
        request_updates: dict[str, Any] = {"status": update.status, "updated_at": now}
        next_tasks: list[dict[str, Any]] = []
        if update.status == "completed":
            policy = await self._published_policy(request["policy_id"])
            graph = self._graph(policy)
            completed_nodes = set(request.get("completed_node_ids", [])) | {task["node_id"]}
            active_node_ids = set(request.get("active_node_ids", []))
            active_node_ids.discard(task["node_id"])
            next_nodes = self._next_executable_nodes(
                graph, task["node_id"], completed_nodes, update.route_label
            )
            for next_node in next_nodes:
                if next_node["id"] in active_node_ids or next_node["id"] in completed_nodes:
                    continue
                next_tasks.append(await self._create_task(request, next_node, now))
                active_node_ids.add(next_node["id"])

            active_stages = [
                self._stage_from_node(graph, node)
                for node in self._nodes_for_ids(graph, active_node_ids)
            ]
            if active_stages:
                primary_stage = active_stages[0]
                request_updates.update(
                    {
                        "status": "in_progress",
                        "current_node_id": primary_stage["id"],
                        "current_stage": primary_stage,
                        "active_node_ids": sorted(active_node_ids),
                        "active_stages": active_stages,
                        "completed_node_ids": sorted(completed_nodes),
                    }
                )
                timeline_entry["status"] = "in_progress"
                if len(active_stages) > 1:
                    timeline_entry["detail"] = update.comment or (
                        f"Tramite continua con {len(active_stages)} actividades en paralelo."
                    )
                else:
                    timeline_entry["detail"] = update.comment or (
                        f"Tramite enviado a {primary_stage['label']}."
                    )
            elif await self._has_open_tasks(request["_id"]):
                request_updates.update(
                    {
                        "status": "in_progress",
                        "active_node_ids": [],
                        "active_stages": [],
                        "completed_node_ids": sorted(completed_nodes),
                    }
                )
                timeline_entry["status"] = "in_progress"
                timeline_entry["detail"] = (
                    update.comment or "Esperando la culminacion de ramas paralelas."
                )
            else:
                final_message = update.final_response or update.comment or "Tramite concluido."
                requires_approval = self._requires_final_approval(policy)
                final_status = "awaiting_approval" if requires_approval else "completed"
                request_updates.update(
                    {
                        "status": final_status,
                        "current_node_id": None,
                        "current_stage": None,
                        "active_node_ids": [],
                        "active_stages": [],
                        "completed_node_ids": sorted(completed_nodes),
                        "is_fully_completed": not requires_approval,
                        "final_response": {
                            "message": final_message,
                            "published_at": now if not requires_approval else None,
                            "published_by": user_id if not requires_approval else None,
                            "requires_approval": requires_approval,
                            "approval_status": "pending" if requires_approval else "approved",
                        },
                    }
                )
                timeline_entry["status"] = final_status
                timeline_entry["detail"] = (
                    "Respuesta final pendiente de aprobacion jerarquica."
                    if requires_approval
                    else final_message
                )

        await self._db["service_requests"].update_one(
            {"_id": request["_id"]},
            {"$set": request_updates, "$push": {"timeline": timeline_entry}},
        )
        if request_updates.get("status") == "completed":
            final_response = request_updates.get("final_response") or {}
            await self._notify_public_completion(
                request,
                str(final_response.get("message", "Tramite concluido.")),
                now,
            )
        await self._db["workflow_events"].insert_one(
            {
                "request_id": str(request["_id"]),
                "tracking_code": request["tracking_code"],
                "policy_id": request["policy_id"],
                "task_id": str(task["_id"]),
                "actor_id": user_id,
                "status": timeline_entry["status"],
                "at": now,
                "is_synthetic": False,
            }
        )
        await self._append_repository_entry(request, task, user_id, update, now)
        task.update(updates)
        response = self._task_response(task)
        response["next_task_assignee_id"] = (
            next_tasks[0].get("assignee_id") if len(next_tasks) == 1 else None
        )
        response["next_task_assignee_ids"] = [
            next_task.get("assignee_id") for next_task in next_tasks if next_task.get("assignee_id")
        ]
        return response

    async def approve_final_response(
        self, request_id: str, approver_id: str, message: str
    ) -> dict[str, Any]:
        if not ObjectId.is_valid(request_id):
            raise RequestNotFoundError
        request = await self._db["service_requests"].find_one({"_id": ObjectId(request_id)})
        if request is None:
            raise RequestNotFoundError
        if request.get("status") != "awaiting_approval":
            raise ValueError("La solicitud no tiene una respuesta pendiente de aprobacion")

        now = datetime.now(UTC)
        final_response = {
            **(request.get("final_response") or {}),
            "message": message,
            "published_at": now,
            "published_by": approver_id,
            "requires_approval": True,
            "approval_status": "approved",
        }
        await self._db["service_requests"].update_one(
            {"_id": request["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "is_fully_completed": True,
                    "final_response": final_response,
                    "updated_at": now,
                },
                "$push": {
                    "timeline": {
                        "at": now,
                        "status": "completed",
                        "detail": "Respuesta final aprobada y publicada para el solicitante.",
                        "actor_id": approver_id,
                    }
                },
            },
        )
        await self._notify_public_completion(request, message, now)
        return {"tracking_code": request["tracking_code"], "status": "completed", **final_response}

    async def _published_policy(self, policy_id: str) -> dict[str, Any]:
        if not ObjectId.is_valid(policy_id):
            raise RequestNotFoundError
        policy = await self._db["policies"].find_one(
            {"_id": ObjectId(policy_id), "status": "published", "is_deleted": {"$ne": True}}
        )
        if policy is None:
            raise RequestNotFoundError
        return policy

    async def _verified_request(self, tracking_code: str, receipt_pin: str) -> dict[str, Any]:
        request = await self._db["service_requests"].find_one(
            {"tracking_code": tracking_code.upper()}
        )
        if request is None:
            raise RequestNotFoundError
        if not hmac.compare_digest(request["receipt_pin_hash"], self._hash_pin(receipt_pin)):
            raise RequestAccessDeniedError
        return request

    @staticmethod
    def _validate_answers(form: dict[str, Any], answers: dict[str, Any]) -> None:
        missing = [
            question.get("label", question.get("id", "campo"))
            for question in form.get("questions", [])
            if question.get("required", True)
            and not str(answers.get(question.get("id"), "")).strip()
        ]
        if missing:
            raise ValueError(f"Faltan respuestas requeridas: {', '.join(missing)}")

    @staticmethod
    def _required_attachment_ids(form: dict[str, Any]) -> set[str]:
        return {
            str(item["id"])
            for item in form.get("attachments", [])
            if item.get("required", True) and item.get("id")
        }

    @staticmethod
    def _hash_pin(receipt_pin: str) -> str:
        return hashlib.sha256(receipt_pin.encode("utf-8")).hexdigest()

    @staticmethod
    def _tracking_code() -> str:
        return f"ED-{datetime.now(UTC):%Y}-{secrets.token_hex(4).upper()}"

    @staticmethod
    def _graph(policy: dict[str, Any]) -> dict[str, Any]:
        diagram = policy.get("diagram_data", {})
        return {"nodes": diagram.get("nodes", []), "edges": diagram.get("edges", [])}

    def _first_executable_node(self, graph: dict[str, Any]) -> dict[str, Any] | None:
        starts = [node for node in graph["nodes"] if node.get("type") == "start"]
        if starts:
            next_nodes = self._next_executable_nodes(graph, str(starts[0].get("id")), set(), None)
            return next_nodes[0] if next_nodes else None
        return next(
            (node for node in graph["nodes"] if node.get("type") in {"activity", "callAction"}),
            None,
        )

    def _next_executable_nodes(
        self,
        graph: dict[str, Any],
        source_id: str,
        completed_node_ids: set[str],
        route_label: str | None,
    ) -> list[dict[str, Any]]:
        """Resolve direct control flows, forks, joins and one guarded decision branch."""
        nodes = {str(node.get("id")): node for node in graph["nodes"]}
        outgoing: dict[str, list[tuple[str, str]]] = {}
        incoming: dict[str, list[str]] = {}
        for edge in graph["edges"]:
            source = str(edge.get("from", edge.get("source", "")))
            target = str(edge.get("to", edge.get("target", "")))
            if source and target:
                outgoing.setdefault(source, []).append((target, str(edge.get("label", ""))))
                incoming.setdefault(target, []).append(source)

        visited: set[str] = set()
        queue = list(outgoing.get(source_id, []))
        resolved: list[dict[str, Any]] = []
        executable = {"activity", "callAction", "acceptEvent", "sendSignal"}
        while queue:
            node_id, edge_label = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)
            node = nodes.get(node_id)
            if node is None:
                continue
            if node.get("type") in executable:
                resolved.append(node)
                continue
            if node.get("type") in {"end", "flowFinal"}:
                continue
            options = outgoing.get(node_id, [])
            if node.get("type") == "join":
                predecessors = set(incoming.get(node_id, []))
                if not predecessors.issubset(completed_node_ids):
                    continue
            if node.get("type") == "decision" and options:
                selected = next(
                    (
                        option
                        for option in options
                        if route_label and option[1].strip().lower() == route_label.strip().lower()
                    ),
                    None,
                )
                if selected is None:
                    selected = next(
                        (
                            option
                            for option in options
                            if option[1].strip().lower() in {"else", "por defecto"}
                        ),
                        options[0],
                    )
                queue.append(selected)
                continue
            queue.extend(options)
        return resolved

    def _nodes_for_ids(self, graph: dict[str, Any], node_ids: set[str]) -> list[dict[str, Any]]:
        return [node for node in graph["nodes"] if str(node.get("id")) in node_ids]

    async def _has_open_tasks(self, request_id: ObjectId) -> bool:
        count = await self._db["workflow_tasks"].count_documents(
            {
                "request_id": request_id,
                "status": {"$nin": ["completed", "rejected", "discarded"]},
            }
        )
        return count > 0

    @staticmethod
    def _requires_final_approval(policy: dict[str, Any]) -> bool:
        return bool(
            policy.get("final_response_requires_approval")
            or policy.get("demo_code") in {"CE", "TI", "RD", "RB"}
        )

    @staticmethod
    def _stage_from_node(
        graph: dict[str, Any], node: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        if node is None:
            return None
        return {
            "id": node.get("id"),
            "label": node.get("label", "Actividad"),
            "department": node.get("department") or None,
            "assignee_id": node.get("assignee") or None,
        }

    async def _create_task(
        self, request: dict[str, Any], node: dict[str, Any], now: datetime
    ) -> dict[str, Any]:
        task = {
            "request_id": request["_id"],
            "tracking_code": request["tracking_code"],
            "service_title": request["service_title"],
            "node_id": node["id"],
            "title": node.get("label", "Actividad"),
            "department": node.get("department") or None,
            "assignee_id": node.get("assignee"),
            "status": "received",
            "priority": request.get("priority", "normal"),
            "created_at": now,
            "updated_at": now,
        }
        result = await self._db["workflow_tasks"].insert_one(task)
        task["_id"] = result.inserted_id
        return task

    async def _append_repository_entry(
        self,
        request: dict[str, Any],
        task: dict[str, Any],
        user_id: str,
        update: TaskStatusUpdate,
        now: datetime,
    ) -> None:
        """Keep a per-worker, per-department trace even when a task creates no attachment."""
        worker = (
            await self._db["users"].find_one({"_id": ObjectId(user_id)})
            if ObjectId.is_valid(user_id)
            else None
        )
        worker_name = (worker or {}).get("name", user_id)
        department = (
            task.get("department") or (worker or {}).get("department") or "Sin departamento"
        )
        repository_key = f"worker:{department}:{worker_name}"
        entry_key = f"live:{task['_id']}:{update.status}:{int(now.timestamp())}"
        await self._db["repository_entries"].update_one(
            {"entry_key": entry_key},
            {
                "$set": {
                    "entry_key": entry_key,
                    "repository_key": repository_key,
                    "department": department,
                    "worker": worker_name,
                    "request_code": request["tracking_code"],
                    "workflow_id": str(request["_id"]),
                    "filename": f"{request['tracking_code']}_{task['node_id']}_{update.status}.bitacora.txt",
                    "uploaded_by": worker_name,
                    "stored_at": now,
                    "status": update.status,
                    "comment": update.comment,
                    "is_synthetic": False,
                }
            },
            upsert=True,
        )

    async def _notify_public_completion(
        self, request: dict[str, Any], message: str, now: datetime
    ) -> None:
        """Persist a guest-facing notice and email it when contact data is available."""
        applicant = request.get("applicant") or {}
        notification = {
            "tracking_code": request["tracking_code"],
            "channel": "tracking_portal",
            "title": "Tu tramite fue totalmente culminado",
            "body": message,
            "email": applicant.get("email"),
            "created_at": now,
            "is_synthetic": bool(request.get("is_synthetic", False)),
        }
        await self._db["guest_notifications"].insert_one(notification)
        email = applicant.get("email")
        if not isinstance(email, str) or not email.strip():
            return
        from app.services.notification_service import NotificationService

        await NotificationService().send_email(
            email.strip(),
            "EASYDOC: tu tramite fue totalmente culminado",
            (
                f"<p>Tu solicitud <strong>{request['tracking_code']}</strong> fue totalmente "
                f"culminada.</p><p>{message}</p>"
            ),
        )

    @staticmethod
    def _task_response(task: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(task["_id"]),
            "request_id": str(task["request_id"]),
            "tracking_code": task["tracking_code"],
            "service_title": task["service_title"],
            "node_id": task["node_id"],
            "title": task["title"],
            "department": task.get("department"),
            "status": task["status"],
            "priority": task["priority"],
            "created_at": task["created_at"],
            "updated_at": task["updated_at"],
        }

    @staticmethod
    def _tracking_response(request: dict[str, Any]) -> dict[str, Any]:
        stage = request.get("current_stage") or {}
        final_response = request.get("final_response") or {}
        active_stages = request.get("active_stages") or ([] if not stage else [stage])
        return {
            "tracking_code": request["tracking_code"],
            "service_title": request["service_title"],
            "status": request["status"],
            "current_stage": stage.get("label"),
            "current_department": stage.get("department"),
            "active_stages": active_stages,
            "is_fully_completed": bool(request.get("is_fully_completed", False)),
            "final_response": final_response.get("message"),
            "final_response_published_at": final_response.get("published_at"),
            "final_response_pending_approval": final_response.get("approval_status") == "pending",
            "created_at": request["created_at"],
            "updated_at": request["updated_at"],
            "attachments": request.get("attachments", []),
            "timeline": request.get("timeline", []),
        }


async def ensure_request_indexes(database: AsyncIOMotorDatabase) -> None:
    """Create the indexes required by guest tracking and staff queues."""
    await database["service_requests"].create_index("tracking_code", unique=True)
    await database["service_requests"].create_index([("policy_id", 1), ("updated_at", -1)])
    await database["workflow_tasks"].create_index([("assignee_id", 1), ("status", 1)])
    await database["workflow_events"].create_index([("request_id", 1), ("at", 1)])
    await database["mobile_devices"].create_index("token_hash", unique=True)
    await database["mobile_devices"].create_index([("user_id", 1), ("is_active", 1)])
    await database["guest_notifications"].create_index([("tracking_code", 1), ("created_at", -1)])
