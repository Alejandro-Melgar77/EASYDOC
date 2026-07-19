from __future__ import annotations

from copy import deepcopy
from types import SimpleNamespace
from typing import Any

import pytest
from app.schemas.requests import GuestApplicant, GuestRequestCreate, TaskStatusUpdate
from app.services.request_service import RequestAccessDeniedError, RequestService
from bson import ObjectId


class Cursor:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def sort(self, field: str, direction: int) -> Cursor:
        self.rows.sort(key=lambda item: item.get(field), reverse=direction < 0)
        return self

    def __aiter__(self):
        async def iterator():
            for item in self.rows:
                yield deepcopy(item)

        return iterator()


class Collection:
    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        return next((deepcopy(item) for item in self.rows if self._matches(item, query)), None)

    async def insert_one(self, document: dict[str, Any]) -> SimpleNamespace:
        row = deepcopy(document)
        row["_id"] = ObjectId()
        self.rows.append(row)
        return SimpleNamespace(inserted_id=row["_id"])

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for row in self.rows if self._matches(row, query))

    async def update_one(
        self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False
    ) -> SimpleNamespace:
        row = next((item for item in self.rows if self._matches(item, query)), None)
        if row is None:
            if not upsert:
                return SimpleNamespace(matched_count=0)
            row = {key: value for key, value in query.items() if not isinstance(value, dict)}
            row["_id"] = ObjectId()
            self.rows.append(row)
        row.update(deepcopy(update.get("$set", {})))
        for field, value in update.get("$push", {}).items():
            row.setdefault(field, []).append(deepcopy(value))
        return SimpleNamespace(matched_count=1)

    def find(self, query: dict[str, Any], _projection: dict[str, Any] | None = None) -> Cursor:
        return Cursor([deepcopy(item) for item in self.rows if self._matches(item, query)])

    @staticmethod
    def _matches(row: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            value = row.get(key)
            if isinstance(expected, dict):
                if "$ne" in expected and value == expected["$ne"]:
                    return False
                if "$nin" in expected and value in expected["$nin"]:
                    return False
            elif value != expected:
                return False
        return True


class Database:
    def __init__(self) -> None:
        self.collections = {
            "policies": Collection(),
            "service_requests": Collection(),
            "workflow_tasks": Collection(),
            "workflow_events": Collection(),
            "repository_entries": Collection(),
            "guest_notifications": Collection(),
            "users": Collection(),
        }

    def __getitem__(self, name: str) -> Collection:
        return self.collections[name]


async def _published_policy(database: Database) -> str:
    policy = {
        "title": "Casos especiales",
        "status": "published",
        "is_deleted": False,
        "form_definition": {
            "questions": [{"id": "code", "label": "Registro", "required": True}],
            "attachments": [{"id": "identity", "label": "Carnet", "required": True}],
        },
        "diagram_data": {
            "nodes": [
                {"id": "start", "type": "start", "label": "Inicio"},
                {
                    "id": "review",
                    "type": "activity",
                    "label": "Revisar",
                    "assignee": "staff-1",
                    "department": "Secretaria",
                },
                {
                    "id": "resolve",
                    "type": "activity",
                    "label": "Resolver",
                    "assignee": "staff-2",
                    "department": "Direccion",
                },
                {"id": "end", "type": "end", "label": "Fin"},
            ],
            "edges": [
                {"from": "start", "to": "review"},
                {"from": "review", "to": "resolve"},
                {"from": "resolve", "to": "end"},
            ],
        },
    }
    result = await database["policies"].insert_one(policy)
    return str(result.inserted_id)


@pytest.mark.asyncio
async def test_guest_request_has_receipt_and_progresses_through_assigned_tasks() -> None:
    database = Database()
    service = RequestService(database=database)  # type: ignore[arg-type]
    policy_id = await _published_policy(database)

    receipt = await service.create_request(
        policy_id,
        GuestRequestCreate(
            applicant=GuestApplicant(full_name="Ana Perez", university_id="2026001"),
            answers={"code": "2026001"},
        ),
    )

    assert receipt["tracking_code"].startswith("ED-")
    assert len(receipt["receipt_pin"]) == 8
    assert receipt["current_stage"] == "Pendiente de documentos"
    assert database["workflow_tasks"].rows == []

    await service.add_attachment(
        receipt["tracking_code"],
        receipt["receipt_pin"],
        "identity",
        {"filename": "identity.jpg", "content_type": "image/jpeg", "size_bytes": 10},
    )
    assert len(database["service_requests"].rows[0]["attachments"]) == 1
    first_task = database["workflow_tasks"].rows[0]
    assert first_task["assignee_id"] == "staff-1"

    await service.update_task(
        str(first_task["_id"]), "staff-1", TaskStatusUpdate(status="completed")
    )
    second_task = database["workflow_tasks"].rows[1]
    assert second_task["assignee_id"] == "staff-2"
    assert database["service_requests"].rows[0]["status"] == "in_progress"

    await service.update_task(
        str(second_task["_id"]), "staff-2", TaskStatusUpdate(status="completed")
    )
    tracking = await service.request_for_tracking(receipt["tracking_code"], receipt["receipt_pin"])
    assert tracking["status"] == "completed"
    assert tracking["current_stage"] is None
    assert tracking["is_fully_completed"] is True
    assert tracking["final_response"] == "Tramite concluido."
    assert len(database["guest_notifications"].rows) == 1


@pytest.mark.asyncio
async def test_guest_tracking_rejects_an_invalid_receipt_pin() -> None:
    database = Database()
    service = RequestService(database=database)  # type: ignore[arg-type]
    policy_id = await _published_policy(database)
    receipt = await service.create_request(
        policy_id,
        GuestRequestCreate(applicant=GuestApplicant(full_name="Ana Perez"), answers={"code": "1"}),
    )

    with pytest.raises(RequestAccessDeniedError):
        await service.request_for_tracking(receipt["tracking_code"], "00000000")
