"""Compatibility alias for the consolidated audit log model."""

from .audit_log import AuditLog

ActivityLog = AuditLog

__all__ = ["ActivityLog"]
