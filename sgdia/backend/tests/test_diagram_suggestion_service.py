from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest
from app.services.diagram_suggestion_service import DiagramSuggestionService


class Cursor:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def sort(self, _field: str, _direction: int) -> Cursor:
        return self

    def limit(self, _value: int) -> Cursor:
        return self

    def __aiter__(self):
        async def iterator():
            for row in self.rows:
                yield deepcopy(row)

        return iterator()


class Collection:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows

    def find(self, _query: dict[str, Any]) -> Cursor:
        return Cursor(self.rows)


class Database:
    def __init__(self, policies: list[dict[str, Any]]) -> None:
        self.policies = Collection(policies)

    def __getitem__(self, name: str) -> Collection:
        assert name == "policies"
        return self.policies


@pytest.mark.asyncio
async def test_suggestion_reuses_closest_local_policy_pattern() -> None:
    database = Database(
        [
            {
                "_id": "policy-reprogramacion",
                "title": "Reprogramacion de Examenes",
                "description": "Solicitud para cambiar una fecha de examen.",
                "status": "published",
                "is_synthetic": True,
                "diagram_data": {
                    "lanes": [{"id": "reception", "name": "Recepcion y Ventanilla"}],
                    "nodes": [
                        {"id": "start", "type": "start", "label": "Inicio"},
                        {"id": "review", "type": "activity", "label": "Revisar reprogramacion"},
                        {"id": "end", "type": "end", "label": "Fin"},
                    ],
                    "edges": [],
                },
                "form_definition": {"questions": [], "attachments": []},
            },
            {
                "_id": "policy-beca",
                "title": "Solicitud de Beca Auxiliar",
                "description": "Apoyo economico.",
                "status": "published",
                "diagram_data": {"lanes": [], "nodes": [], "edges": []},
                "form_definition": {"questions": [], "attachments": []},
            },
        ]
    )
    service = DiagramSuggestionService(database=database)  # type: ignore[arg-type]

    result = await service.suggest(
        "Necesito reprogramar mi examen",
        ["start", "activity"],
        ["Recepcion y Ventanilla"],
    )

    assert result["title"] == "Reprogramacion de Examenes"
    assert result["source_policy_id"] == "policy-reprogramacion"
    assert result["source_is_synthetic"] is True
    assert result["confidence"] >= 56
