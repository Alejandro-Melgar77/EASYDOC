from __future__ import annotations

from copy import deepcopy
from types import SimpleNamespace

import pytest
from app.schemas.policies import PolicyCreate, PolicyUpdate
from app.services.policy_collaboration_persistence import PolicyCollaborationPersistenceService
from app.services.policy_service import PolicyService, PolicyVersionConflictError
from app.services.workflow_engine import WorkflowEngine
from bson import ObjectId
from pydantic import ValidationError


class InMemoryCursor:
    def __init__(self, rows: list[dict]):
        self.rows = rows

    def sort(self, field: str, direction: int):
        self.rows.sort(key=lambda row: row.get(field), reverse=direction < 0)
        return self

    def skip(self, amount: int):
        self.rows = self.rows[amount:]
        return self

    def limit(self, amount: int):
        self.rows = self.rows[:amount]
        return self

    def __aiter__(self):
        async def iterator():
            for row in self.rows:
                yield deepcopy(row)

        return iterator()


class InMemoryCollection:
    def __init__(self):
        self.rows: list[dict] = []

    async def find_one(self, query: dict):
        for row in self.rows:
            if self._matches(row, query):
                return deepcopy(row)
        return None

    async def insert_one(self, document: dict):
        inserted_id = ObjectId()
        row = deepcopy(document)
        row["_id"] = inserted_id
        self.rows.append(row)
        return SimpleNamespace(inserted_id=inserted_id)

    async def delete_one(self, query: dict):
        self.rows = [row for row in self.rows if not self._matches(row, query)]

    async def count_documents(self, query: dict):
        return sum(self._matches(row, query) for row in self.rows)

    def find(self, query: dict):
        return InMemoryCursor([row for row in self.rows if self._matches(row, query)])

    async def find_one_and_update(self, query: dict, update: dict, **kwargs):
        for row in self.rows:
            if not self._matches(row, query):
                continue
            row.update(deepcopy(update["$set"]))
            for field, value in update["$inc"].items():
                row[field] = row.get(field, 0) + value
            return deepcopy(row)
        return None

    @staticmethod
    def _matches(row: dict, query: dict) -> bool:
        for field, expected in query.items():
            if isinstance(expected, dict) and "$ne" in expected:
                if row.get(field) == expected["$ne"]:
                    return False
            elif row.get(field) != expected:
                return False
        return True


class InMemoryDatabase:
    def __init__(self):
        self.collections = {
            "policies": InMemoryCollection(),
            "policy_versions": InMemoryCollection(),
        }

    def __getitem__(self, name: str):
        return self.collections[name]


def policy_payload(title: str = "Casos especiales academicos") -> dict:
    return {
        "title": title,
        "description": "Solicitud de levantamiento de prerrequisitos.",
        "diagram_data": {
            "nodes": [
                {
                    "id": "start-1",
                    "type": "start",
                    "x": 50,
                    "y": 80,
                    "label": "Solicitud recibida",
                    "department": "Ventanilla",
                    "assignee": "",
                    "description": "",
                },
                {
                    "id": "activity-1",
                    "type": "activity",
                    "x": 260,
                    "y": 80,
                    "label": "Validar requisitos",
                    "department": "Secretaria",
                    "assignee": "secretaria-1",
                    "description": "",
                },
                {
                    "id": "end-1",
                    "type": "end",
                    "x": 490,
                    "y": 80,
                    "label": "Fin",
                    "department": "Secretaria",
                    "assignee": "",
                    "description": "",
                },
            ],
            "edges": [
                {"id": "edge-1", "from": "start-1", "to": "activity-1", "label": ""},
                {"id": "edge-2", "from": "activity-1", "to": "end-1", "label": ""},
            ],
        },
        "form_definition": {
            "questions": [
                {
                    "id": "question-1",
                    "label": "Codigo universitario",
                    "type": "text",
                    "required": True,
                    "options": "",
                }
            ],
            "attachments": [
                {
                    "id": "attachment-1",
                    "label": "Carnet de identidad",
                    "acceptedFormats": "PDF, JPG, PNG",
                    "required": True,
                }
            ],
        },
    }


@pytest.mark.asyncio
async def test_create_persists_diagram_form_and_initial_snapshot():
    database = InMemoryDatabase()
    service = PolicyService(database=database)

    created = await service.create(PolicyCreate.model_validate(policy_payload()), "director-1")

    assert created["version"] == 1
    assert created["form_definition"]["attachments"][0]["acceptedFormats"] == "PDF, JPG, PNG"
    assert len(database["policies"].rows) == 1
    assert database["policy_versions"].rows[0]["version"] == 1
    assert database["policy_versions"].rows[0]["diagram_data"] == created["diagram_data"]
    assert database["policy_versions"].rows[0]["form_definition"] == created["form_definition"]


@pytest.mark.asyncio
async def test_policy_can_be_saved_without_form_items_and_listed():
    database = InMemoryDatabase()
    service = PolicyService(database=database)
    payload = policy_payload()
    payload["form_definition"] = {"questions": [], "attachments": []}

    created = await service.create(PolicyCreate.model_validate(payload), "director-1")
    listing = await service.list(page=1, page_size=20, status="draft")

    assert created["form_definition"] == {"questions": [], "attachments": []}
    assert listing["total"] == 1
    assert listing["policies"][0]["id"] == created["id"]


@pytest.mark.asyncio
async def test_update_creates_new_snapshot_and_rejects_stale_version():
    database = InMemoryDatabase()
    service = PolicyService(database=database)
    created = await service.create(PolicyCreate.model_validate(policy_payload()), "director-1")

    updated = await service.update(
        created["id"],
        PolicyUpdate(
            description="Requisitos validados por Secretaria.",
            expected_version=1,
            change_summary="Updated document validation instructions",
        ),
        "secretaria-1",
    )

    assert updated["version"] == 2
    assert len(database["policy_versions"].rows) == 2
    assert database["policy_versions"].rows[-1]["created_by"] == "secretaria-1"
    assert database["policy_versions"].rows[-1]["description"] == updated["description"]

    with pytest.raises(PolicyVersionConflictError):
        await service.update(
            created["id"],
            PolicyUpdate(title="Otro titulo", expected_version=1),
            "director-1",
        )


def test_policy_schema_rejects_connections_to_unknown_nodes():
    payload = policy_payload()
    payload["diagram_data"]["edges"][0]["to"] = "missing-node"

    with pytest.raises(ValidationError):
        PolicyCreate.model_validate(payload)


@pytest.mark.asyncio
async def test_workflow_engine_parses_saved_editor_format():
    graph = await WorkflowEngine().parse_diagram(policy_payload()["diagram_data"])

    assert graph["start_node_id"] == "start-1"
    assert graph["edges"][0]["source"] == "start-1"
    assert graph["edges"][0]["target"] == "activity-1"


@pytest.mark.asyncio
async def test_collaboration_operations_are_durable_without_a_manual_policy_save():
    database = InMemoryDatabase()
    policy_service = PolicyService(database=database)
    policy = await policy_service.create(
        PolicyCreate.model_validate(policy_payload()), "director-1"
    )
    collaboration = PolicyCollaborationPersistenceService(database=database)

    created = await collaboration.apply(
        policy["id"],
        "node.create",
        {
            "node": {
                "id": "activity-2",
                "type": "activity",
                "x": 720,
                "y": 80,
                "label": "Emitir respuesta",
                "department": "Secretaria",
                "assignee": "secretaria-1",
                "description": "",
            }
        },
        "secretaria-1",
    )
    await collaboration.apply(
        policy["id"],
        "edge.create",
        {"edge": {"id": "edge-3", "from": "activity-1", "to": "activity-2", "label": ""}},
        "secretaria-1",
    )
    await collaboration.apply(
        policy["id"],
        "form.update",
        {"form": {"questions": [], "attachments": []}},
        "secretaria-1",
    )

    persisted = await policy_service.get(policy["id"])

    assert created["revision"] == 1
    assert persisted["collaboration_revision"] == 3
    assert {node["id"] for node in persisted["diagram_data"]["nodes"]} >= {"activity-2"}
    assert any(edge["id"] == "edge-3" for edge in persisted["diagram_data"]["edges"])
    assert persisted["form_definition"] == {"questions": [], "attachments": []}
    assert len(database["policy_versions"].rows) == 1
