"""Deterministic, offline semantic retrieval for EASYDOC.

The project deliberately keeps this engine local: it uses a hashing TF-IDF
representation instead of an external embedding API.  It is therefore
reproducible, auditable and useful as a baseline while anonymised institutional
data is being collected for a future neural model.
"""

from __future__ import annotations

import hashlib
import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any

_DIMENSIONS = 256
_STOP_WORDS = {
    "a",
    "al",
    "con",
    "de",
    "del",
    "el",
    "en",
    "es",
    "estoy",
    "la",
    "las",
    "lo",
    "los",
    "mi",
    "necesito",
    "para",
    "por",
    "que",
    "quiero",
    "se",
    "tengo",
    "un",
    "una",
    "y",
}


@dataclass(frozen=True)
class SemanticDocument:
    """A local searchable record with only the fields required for ranking."""

    identifier: str
    title: str
    content: str
    metadata: dict[str, Any]


class LocalSemanticRetriever:
    """Rank small local corpora using deterministic hashed TF-IDF vectors."""

    def __init__(self, documents: list[SemanticDocument]) -> None:
        self._documents = documents
        self._idf = _inverse_document_frequency(documents)
        self._vectors = {
            document.identifier: self._vectorize(document.content) for document in documents
        }

    @classmethod
    def from_agentic_cases(cls, cases: list[dict[str, Any]]) -> LocalSemanticRetriever:
        documents = [
            SemanticDocument(
                identifier=str(case["id"]),
                title=str(case.get("policy_name", case.get("policy_code", "Politica"))),
                content=" ".join(
                    [
                        str(case.get("student_message", "")),
                        " ".join(str(keyword) for keyword in case.get("keywords", [])),
                    ]
                ),
                metadata={
                    "policy_code": str(case.get("policy_code", "")),
                    "is_synthetic": bool(case.get("is_synthetic", False)),
                },
            )
            for case in cases
            if case.get("id") and case.get("policy_code")
        ]
        return cls(documents)

    @staticmethod
    def embed_text(text: str) -> list[float]:
        """Return a stable local vector suitable for persisted document search."""
        counts = Counter(_tokens(text))
        norm = math.sqrt(sum(value * value for value in counts.values()))
        vector = [0.0] * _DIMENSIONS
        if norm == 0:
            return vector
        for token, count in counts.items():
            vector[_bucket(token)] += count / norm
        return [round(value, 6) for value in vector]

    def search(self, query: str, limit: int = 5) -> list[tuple[SemanticDocument, float]]:
        if not query.strip() or not self._documents:
            return []
        query_vector = self._vectorize(query)
        ranked = [
            (document, _cosine(query_vector, self._vectors[document.identifier]))
            for document in self._documents
        ]
        return [
            item
            for item in sorted(ranked, key=lambda item: (-item[1], item[0].identifier))[:limit]
            if item[1] > 0
        ]

    def policy_scores(self, query: str) -> dict[str, float]:
        """Aggregate the strongest local case match for each policy."""
        scores: dict[str, float] = defaultdict(float)
        for document, score in self.search(query, limit=len(self._documents)):
            policy_code = str(document.metadata.get("policy_code", ""))
            if policy_code:
                scores[policy_code] = max(scores[policy_code], score)
        return dict(scores)

    def _vectorize(self, text: str) -> list[float]:
        counts = Counter(_tokens(text))
        vector = [0.0] * _DIMENSIONS
        for token, count in counts.items():
            vector[_bucket(token)] += (1.0 + math.log(count)) * self._idf.get(token, 1.0)
        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector


def _inverse_document_frequency(documents: list[SemanticDocument]) -> dict[str, float]:
    document_frequency: Counter[str] = Counter()
    for document in documents:
        document_frequency.update(set(_tokens(document.content)))
    total = max(len(documents), 1)
    return {
        token: math.log((total + 1) / (count + 1)) + 1.0
        for token, count in document_frequency.items()
    }


def _tokens(value: str) -> list[str]:
    normalized = "".join(
        char
        for char in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(char) != "Mn"
    )
    return [token for token in re.findall(r"[a-z0-9]{3,}", normalized) if token not in _STOP_WORDS]


def _bucket(token: str) -> int:
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % _DIMENSIONS


def _cosine(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=True))
