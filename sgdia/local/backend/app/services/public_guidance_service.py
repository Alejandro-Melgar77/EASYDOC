"""Explainable offline advisor for guests choosing an academic procedure."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.ml.semantic_retriever import LocalSemanticRetriever
from app.schemas.guidance import GuidanceRequirement, PublicGuidanceResponse

_CORPUS_PATH = (
    Path(__file__).resolve().parents[1] / "ml" / "training_data" / "easydoc_agentic_cases.json"
)


class PublicGuidanceService:
    """Ranks policy intents from the local, versioned guidance corpus."""

    def __init__(self, database: AsyncIOMotorDatabase | None = None) -> None:
        self._database = database

    @property
    def _db(self) -> AsyncIOMotorDatabase:
        return self._database or get_database()

    async def advise(self, query: str) -> PublicGuidanceResponse:
        candidates = await self._published_policies()
        if not candidates:
            return self._clarification_response()

        scores = self._score(query)
        best_policy: dict[str, Any] | None = None
        best_score = 0.0
        for policy in candidates:
            policy_score = scores.get(policy.get("demo_code", ""), 0.0)
            policy_score = max(policy_score, _policy_text_score(query, policy))
            if policy_score > best_score:
                best_policy, best_score = policy, policy_score

        if best_policy is None or best_score < 0.16:
            return self._clarification_response()

        form = best_policy.get("form_definition", {})
        requirements = [
            GuidanceRequirement(
                id=str(item["id"]),
                label=str(item["label"]),
                required=bool(item.get("required", True)),
            )
            for item in form.get("attachments", [])
            if item.get("id") and item.get("label")
        ]
        title = str(best_policy["title"])
        confidence = round(min(0.94, 0.52 + best_score), 2)
        return PublicGuidanceResponse(
            outcome="recommended",
            message=(
                f"Para tu caso, EASYDOC recomienda iniciar el tramite '{title}'. "
                "Completa el formulario y prepara los requisitos indicados antes de enviarlo."
            ),
            confidence=confidence,
            policy_id=str(best_policy["_id"]),
            policy_title=title,
            rationale=[
                "La recomendacion se obtuvo de un corpus local de casos academicos.",
                "La politica se encuentra publicada y disponible para solicitudes invitadas.",
            ],
            requirements=requirements,
            suggested_questions=[
                str(question.get("label"))
                for question in form.get("questions", [])
                if question.get("label")
            ][:4],
        )

    async def _published_policies(self) -> list[dict[str, Any]]:
        cursor = self._db["policies"].find(
            {"status": "published", "is_deleted": {"$ne": True}},
            {"title": 1, "description": 1, "demo_code": 1, "form_definition": 1},
        )
        return [policy async for policy in cursor]

    @staticmethod
    def _score(query: str) -> dict[str, float]:
        if not _CORPUS_PATH.exists():
            return {}
        corpus = json.loads(_CORPUS_PATH.read_text(encoding="utf-8"))
        return LocalSemanticRetriever.from_agentic_cases(corpus.get("cases", [])).policy_scores(
            query
        )

    @staticmethod
    def _clarification_response() -> PublicGuidanceResponse:
        return PublicGuidanceResponse(
            outcome="clarify",
            message=(
                "Para orientarte con precision, indica si tu caso trata de materias, certificado de notas, "
                "retiro de una materia, homologacion o beca."
            ),
            confidence=0.0,
            suggested_questions=[
                "Que tramite necesitas realizar?",
                "En que periodo academico ocurre el caso?",
            ],
        )


def _policy_text_score(query: str, policy: dict[str, Any]) -> float:
    document = {
        "id": "published-policy",
        "policy_code": str(policy.get("demo_code", "")),
        "policy_name": str(policy.get("title", "")),
        "student_message": f"{policy.get('title', '')} {policy.get('description', '')}",
        "keywords": [],
    }
    return (
        LocalSemanticRetriever.from_agentic_cases([document])
        .policy_scores(query)
        .get(document["policy_code"], 0.0)
    )
