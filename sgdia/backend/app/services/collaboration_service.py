import logging
import time
from datetime import UTC, datetime

import httpx
import jwt

from app.core.config import get_settings
from app.core.database import get_database
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class CollaborationService:
    def __init__(self):
        self.settings = get_settings()
        self.secret = "sgdia-onlyoffice-secret"  # Used in docker-compose.yml

    def generate_onlyoffice_config(
        self,
        document_id: str,
        user_id: str,
        user_name: str,
        file_url: str,
        filename: str,
        editable: bool,
    ) -> dict:
        """CU-17: Configuración para abrir sesión de ONLYOFFICE"""
        # Document type mapping
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        doc_type = "word"
        if ext in ["xls", "xlsx", "csv"]:
            doc_type = "cell"
        elif ext in ["ppt", "pptx"]:
            doc_type = "slide"

        config = {
            "document": {
                "fileType": ext,
                "key": f"{document_id}_{int(time.time())}",
                "title": filename,
                "url": file_url,
                "permissions": {
                    "edit": editable,
                    "download": True,
                    "print": True,
                    "review": editable,
                },
            },
            "documentType": doc_type,
            "editorConfig": {
                "user": {"id": user_id, "name": user_name},
                "callbackUrl": f"http://backend:8000/api/collaboration/callback?doc_id={document_id}",
                "mode": "edit" if editable else "view",
                "customization": {"forcesave": True},
            },
        }

        # Sign the config
        token = jwt.encode(config, self.secret, algorithm="HS256")
        config["token"] = token

        return config

    async def handle_callback(self, doc_id: str, payload: dict) -> dict:
        """CU-17: Webhook guardado ONLYOFFICE"""
        status = payload.get("status")

        # Only successful close/force-save events contain a retrievable document URL.
        if status in {2, 6}:
            download_uri = payload.get("url")
            users = payload.get("users", [])

            if download_uri:
                db = get_database()
                from bson import ObjectId

                document = await db["documents"].find_one(
                    {"_id": ObjectId(doc_id), "is_active": True}
                )
                if document is None:
                    return {"error": 1}
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.get(download_uri)
                    response.raise_for_status()
                from app.services.storage_service import StorageService

                content = response.content
                file_key = await StorageService().upload_file_bytes(
                    content,
                    document["filename"],
                    document.get("content_type") or "application/octet-stream",
                    f"documents/{doc_id}/",
                )
                version = int(document.get("version", 1)) + 1
                saved_at = datetime.now(UTC)
                await db["documents"].update_one(
                    {"_id": document["_id"]},
                    {
                        "$set": {
                            "file_key": file_key,
                            "size_bytes": len(content),
                            "version": version,
                            "updated_at": saved_at,
                        }
                    },
                )
                await db["document_versions"].insert_one(
                    {
                        "document_id": doc_id,
                        "version": version,
                        "file_key": file_key,
                        "size_bytes": len(content),
                        "created_by": users[0] if users else "system",
                        "created_at": saved_at,
                        "change_summary": "Actualizacion colaborativa desde ONLYOFFICE",
                    }
                )

                await AuditService.log_action(
                    user_id=users[0] if users else None,
                    action=AuditService.ACTIONS["DOC_UPDATE"],
                    entity_type="document",
                    entity_id=doc_id,
                    details={"via": "onlyoffice", "status": status, "version": version},
                )

        return {"error": 0}

    async def get_comments(self, document_id: str) -> list:
        """CU-19: Obtener comentarios de documento"""
        db = get_database()
        comments_col = db["document_comments"]

        cursor = comments_col.find({"document_id": document_id}).sort("created_at", -1)
        comments = []
        async for c in cursor:
            c["id"] = str(c["_id"])
            del c["_id"]
            comments.append(c)

        return comments

    async def add_comment(
        self, document_id: str, user_id: str, text: str, position: dict | None = None
    ) -> dict:
        """CU-19: Agregar comentario a documento"""
        db = get_database()
        comments_col = db["document_comments"]

        comment = {
            "document_id": document_id,
            "user_id": user_id,
            "text": text,
            "position": position,  # Context specific location in doc
            "created_at": time.time(),
            "resolved": False,
        }

        result = await comments_col.insert_one(comment)
        comment["id"] = str(result.inserted_id)
        del comment["_id"]

        return comment
