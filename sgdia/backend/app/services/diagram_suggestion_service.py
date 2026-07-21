"""Local policy-pattern recommender for the EASYDOC UML editor.

It intentionally uses only the policy corpus stored in MongoDB. The score is
explainable token overlap, which keeps Tab completion deterministic and useful
while real operational data is still being collected.
"""

from __future__ import annotations

import math
import re
import unicodedata
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database


class DiagramSuggestionService:
    """Find the closest existing policy and expose it as a reusable template."""

    def __init__(self, database: AsyncIOMotorDatabase | None = None) -> None:
        self._database = database

    @property
    def _db(self) -> AsyncIOMotorDatabase:
        return self._database if self._database is not None else get_database()

    async def suggest(
        self,
        process_name: str,
        existing_node_types: list[str],
        lane_names: list[str],
    ) -> dict[str, Any]:
        cursor = (
            self._db["policies"]
            .find(
                {
                    "is_deleted": {"$ne": True},
                    "status": {"$in": ["draft", "in_review", "published"]},
                }
            )
            .sort("updated_at", -1)
            .limit(200)
        )
        policies = [policy async for policy in cursor]
        if not policies:
            return self._fallback(process_name, lane_names)

        query_terms = self._terms(process_name)
        node_set = {item.strip() for item in existing_node_types if item.strip()}
        lane_terms = self._terms(" ".join(lane_names))
        ranked = [
            (self._score(policy, query_terms, node_set, lane_terms), policy) for policy in policies
        ]
        score, policy = max(ranked, key=lambda item: item[0])
        confidence = max(56, min(98, round(56 + score * 42)))
        title = str(policy.get("title", "Tramite academico"))
        return {
            "title": title,
            "confidence": confidence,
            "rationale": (
                f"Patron local derivado de '{title}' con coincidencia de nombre, carriles y actividades."
            ),
            "source_policy_id": str(policy["_id"]),
            "source_is_synthetic": bool(policy.get("is_synthetic", False)),
            "diagram_data": policy.get("diagram_data", {"nodes": [], "edges": [], "lanes": []}),
            "form_definition": policy.get("form_definition", {"questions": [], "attachments": []}),
        }

    def _score(
        self,
        policy: dict[str, Any],
        query_terms: set[str],
        existing_node_types: set[str],
        lane_terms: set[str],
    ) -> float:
        diagram = policy.get("diagram_data", {})
        nodes = diagram.get("nodes", [])
        document = " ".join(
            [
                str(policy.get("title", "")),
                str(policy.get("description", "")),
                *(str(node.get("label", "")) for node in nodes),
                *(str(node.get("department", "")) for node in nodes),
            ]
        )
        policy_terms = self._terms(document)
        if query_terms:
            lexical = len(query_terms & policy_terms) / math.sqrt(
                len(query_terms) * max(1, len(policy_terms))
            )
        else:
            lexical = 0.4
        policy_types = {str(node.get("type", "")) for node in nodes}
        type_score = len(existing_node_types & policy_types) / max(1, len(existing_node_types))
        policy_lanes = self._terms(
            " ".join(str(lane.get("name", "")) for lane in diagram.get("lanes", []))
        )
        lane_score = len(lane_terms & policy_lanes) / max(1, len(lane_terms))
        return lexical * 0.7 + type_score * 0.18 + lane_score * 0.12

    @staticmethod
    def _terms(value: str) -> set[str]:
        normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        return {term for term in re.findall(r"[a-z0-9]{3,}", normalized.lower())}

    @staticmethod
    def _fallback(process_name: str, lane_names: list[str]) -> dict[str, Any]:
        lanes = [
            {"id": f"lane-{index + 1}", "name": name, "color": None}
            for index, name in enumerate(lane_names or ["Recepcion", "Secretaria academica"])
        ]
        return {
            "title": process_name.strip() or "Tramite academico administrativo",
            "confidence": 55,
            "rationale": "Plantilla local basica; aun no hay politicas comparables persistidas.",
            "source_policy_id": None,
            "source_is_synthetic": False,
            "diagram_data": {
                "lanes": lanes,
                "nodes": [
                    {
                        "id": "start",
                        "type": "start",
                        "x": 220,
                        "y": 120,
                        "label": "Inicio",
                        "department": lanes[0]["name"],
                        "laneId": lanes[0]["id"],
                    },
                    {
                        "id": "review",
                        "type": "activity",
                        "x": 430,
                        "y": 120,
                        "label": "Validar solicitud",
                        "department": lanes[0]["name"],
                        "laneId": lanes[0]["id"],
                    },
                    {
                        "id": "end",
                        "type": "end",
                        "x": 690,
                        "y": 120,
                        "label": "Fin de actividad",
                        "department": lanes[-1]["name"],
                        "laneId": lanes[-1]["id"],
                    },
                ],
                "edges": [
                    {
                        "id": "edge-1",
                        "from": "start",
                        "to": "review",
                        "label": "",
                        "kind": "control",
                    },
                    {"id": "edge-2", "from": "review", "to": "end", "label": "", "kind": "control"},
                ],
            },
            "form_definition": {"questions": [], "attachments": []},
        }
