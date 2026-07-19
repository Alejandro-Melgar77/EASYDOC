"""Compatibility adapter that keeps legacy callers offline.

Authenticated AI responses are now assembled by :mod:`rag_engine` from local
documents.  This class remains only to avoid silently re-enabling a cloud LLM
through environment variables from older deployments.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class LLMClient:
    """Return a transparent local-only response for obsolete direct calls."""

    async def generate_response(
        self, prompt: str, system_prompt: str = "", history: list[dict[str, str]] | None = None
    ) -> str:
        del prompt, system_prompt, history
        logger.warning(
            "Legacy LLMClient requested; remote providers are disabled in local EASYDOC mode"
        )
        return (
            "El motor remoto esta deshabilitado. EASYDOC responde con recuperacion local y requiere "
            "documentos autorizados para dar una respuesta verificable."
        )
