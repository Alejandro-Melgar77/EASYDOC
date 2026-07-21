"""Local retrieval-augmented responses for authenticated EASYDOC users."""

from __future__ import annotations

from typing import Any

from app.core.database import get_database
from app.ml.semantic_retriever import LocalSemanticRetriever, SemanticDocument


class RAGEngine:
    """Search locally extracted documents and answer only from retrieved context."""

    async def query(
        self, text: str, context_filters: dict[str, Any] | None = None
    ) -> tuple[str, list[dict[str, Any]]]:
        documents = await self._load_documents(context_filters or {})
        matches = LocalSemanticRetriever(documents).search(text, limit=5)
        sources = [
            {
                "id": document.identifier,
                "title": document.title,
                "content": document.content[:600],
                "score": round(score, 3),
                "engine": "local_hashing_tfidf_v1",
            }
            for document, score in matches
        ]
        if not sources:
            return (
                "No encuentro suficiente informacion en los documentos locales autorizados para responder. "
                "Revisa el expediente o escala la consulta a un responsable.",
                [],
            )

        summary = "\n".join(f"- {source['title']}: {source['content']}" for source in sources[:3])
        return (
            "Respuesta basada exclusivamente en documentos locales relevantes:\n" + summary,
            sources,
        )

    async def _load_documents(self, filters: dict[str, Any]) -> list[SemanticDocument]:
        query: dict[str, Any] = {"is_active": True}
        if isinstance(filters.get("folder_id"), str):
            query["folder_id"] = filters["folder_id"]
        if isinstance(filters.get("tags"), list) and filters["tags"]:
            query["tags"] = {"$in": [str(tag) for tag in filters["tags"]]}

        db = get_database()
        cursor = (
            db["documents"]
            .find(
                query,
                {"title": 1, "filename": 1, "description": 1, "extracted_text": 1},
            )
            .limit(300)
        )
        records = [record async for record in cursor]
        return [
            SemanticDocument(
                identifier=str(record.get("_id", record.get("id", "document"))),
                title=str(record.get("title") or record.get("filename") or "Documento sin titulo"),
                content=" ".join(
                    str(record.get(field, "")) for field in ("description", "extracted_text")
                ).strip(),
                metadata={},
            )
            for record in records
            if record.get("extracted_text") or record.get("description")
        ]
