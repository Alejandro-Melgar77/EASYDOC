import logging
from datetime import UTC, datetime
from typing import Any

from app.core.database import get_database

logger = logging.getLogger(__name__)


class AuditService:
    """Servicio de auditoría para registrar todas las acciones del sistema."""

    ACTIONS = {
        # Auth actions
        "LOGIN": "login",
        "LOGIN_FAILED": "login_failed",
        "LOGOUT": "logout",
        "REGISTER": "register",
        "TOKEN_REFRESH": "token_refresh",
        "ACCOUNT_LOCKED": "account_locked",
        # User actions
        "USER_CREATE": "user_create",
        "USER_UPDATE": "user_update",
        "USER_DEACTIVATE": "user_deactivate",
        # Role actions
        "ROLE_CREATE": "role_create",
        "ROLE_UPDATE": "role_update",
        "ROLE_DELETE": "role_delete",
        # Document actions
        "DOC_UPLOAD": "document_upload",
        "DOC_DOWNLOAD": "document_download",
        "DOC_DELETE": "document_delete",
        "DOC_UPDATE": "document_update",
        "DOC_PERMISSION_CHANGE": "document_permission_change",
        # Collaboration actions
        "COLLAB_SESSION_START": "collaboration_session_start",
        "COLLAB_SESSION_END": "collaboration_session_end",
        # Policy actions
        "POLICY_CREATE": "policy_create",
        "POLICY_UPDATE": "policy_update",
        "POLICY_COLLABORATION_UPDATE": "policy_collaboration_update",
        "POLICY_APPROVE": "policy_approve",
        "POLICY_SUBMIT_REVIEW": "policy_submit_review",
        # AI Agent actions
        "AGENT_QUERY": "agent_query",
        "AGENT_ESCALATE": "agent_escalate",
        # Prediction/ML actions
        "PREDICTION_ROUTE": "prediction_route",
        "PREDICTION_BOTTLENECK": "prediction_bottleneck",
        "PREDICTION_ANOMALY": "prediction_anomaly",
        "PREDICTION_RESOURCE": "prediction_resource",
        # Report actions
        "REPORT_GENERATE": "report_generate",
        "REPORT_DOWNLOAD": "report_download",
        "REPORT_SCHEDULE": "report_schedule",
        # System actions
        "SETTINGS_UPDATE": "settings_update",
    }

    @staticmethod
    async def log_action(
        user_id: str | None,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        result: str = "success",
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> str:
        """Register an audit log entry."""
        try:
            db = get_database()
            audit_col = db["audit_logs"]

            log_entry = {
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "result": result,
                "details": details or {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": datetime.now(UTC),
            }

            result_insert = await audit_col.insert_one(log_entry)
            logger.info(f"Audit log: {action} on {entity_type}/{entity_id} by {user_id} - {result}")

            return str(result_insert.inserted_id)
        except Exception as e:
            logger.error(f"Error saving audit log: {e}")
            return ""

    @staticmethod
    async def get_logs(
        page: int = 1,
        page_size: int = 50,
        user_id: str | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        result: str | None = None,
    ) -> dict:
        """Query audit logs with filters and pagination."""
        db = get_database()
        audit_col = db["audit_logs"]

        query: dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        if action:
            query["action"] = action
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        if result:
            query["result"] = result

        if date_from or date_to:
            query["timestamp"] = {}
            if date_from:
                query["timestamp"]["$gte"] = date_from
            if date_to:
                query["timestamp"]["$lte"] = date_to

        skip = (page - 1) * page_size

        total = await audit_col.count_documents(query)
        cursor = audit_col.find(query).sort("timestamp", -1).skip(skip).limit(page_size)

        logs = []
        async for log in cursor:
            log["_id"] = str(log["_id"])
            logs.append(log)

        return {"logs": logs, "total": total, "page": page, "page_size": page_size}

    @staticmethod
    async def get_entity_trace(entity_type: str, entity_id: str) -> list[dict]:
        """CU-39: Get complete trace of all actions on a specific entity."""
        db = get_database()
        audit_col = db["audit_logs"]

        cursor = audit_col.find({"entity_type": entity_type, "entity_id": entity_id}).sort(
            "timestamp", 1
        )

        logs = []
        async for log in cursor:
            log["_id"] = str(log["_id"])
            logs.append(log)

        return logs

    @staticmethod
    async def export_logs(format: str = "json", filters: dict | None = None) -> list[dict]:
        """Export audit logs in JSON or CSV-ready format."""
        db = get_database()
        audit_col = db["audit_logs"]

        query = filters or {}
        cursor = audit_col.find(query).sort("timestamp", -1)

        logs = []
        async for log in cursor:
            log["_id"] = str(log["_id"])
            logs.append(log)

        return logs
