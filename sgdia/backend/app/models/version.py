"""
sgdia/backend/app/models/version.py

Alias de importación para document_version.py.
Necesario porque database.py importa `from app.models.version import Version`.
"""

from .document_version import DocumentVersion as Version  # noqa: F401

__all__ = ["Version"]
