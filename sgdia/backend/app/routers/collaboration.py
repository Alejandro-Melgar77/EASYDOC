from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Request

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.schemas.collaboration import CommentCreate, CommentResponse, SessionCreate
from app.schemas.common import MessageResponse
from app.services.audit_service import AuditService
from app.services.collaboration_service import CollaborationService
from app.services.storage_service import StorageService

router = APIRouter(prefix="/collaboration", tags=["Colaboración"])
collab_service = CollaborationService()
storage_service = StorageService()


@router.post("/sessions", response_model=dict)
async def open_session(
    data: SessionCreate,
    request: Request,
    current_user: dict = Depends(require_permissions("documents:write")),
):
    """CU-17: Abrir sesión colaborativa (generar config ONLYOFFICE)"""
    db = get_database()
    docs_col = db["documents"]

    doc = await docs_col.find_one({"_id": ObjectId(data.document_id), "is_active": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    allowed_roles = set(doc.get("editable_roles", []))
    current_roles = set(current_user.get("roles", []))
    editable = not allowed_roles or bool(allowed_roles & current_roles)

    # Get temporary URL for ONLYOFFICE to download the file
    file_url = storage_service.get_presigned_url(doc["file_key"])

    # Generate OnlyOffice config
    user_id = current_user.get("sub")

    users_col = db["users"]
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    user_name = (user or {}).get("full_name") or (user or {}).get("name") or "Usuario EASYDOC"

    config = collab_service.generate_onlyoffice_config(
        document_id=str(doc["_id"]),
        user_id=user_id,
        user_name=user_name,
        file_url=file_url,
        filename=doc["filename"],
        editable=editable,
    )

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=user_id,
        action=AuditService.ACTIONS["COLLAB_SESSION_START"],
        entity_type="document",
        entity_id=data.document_id,
        ip_address=ip_address,
    )

    return config


@router.post("/callback")
async def onlyoffice_callback(
    doc_id: str,
    payload: dict = Body(...),
):
    """Webhook para guardado desde ONLYOFFICE"""
    return await collab_service.handle_callback(doc_id, payload)


@router.get("/{doc_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    doc_id: str, current_user: dict = Depends(require_permissions("documents:read"))
):
    """CU-19: Obtener comentarios del documento"""
    return await collab_service.get_comments(doc_id)


@router.post("/{doc_id}/comments", response_model=CommentResponse)
async def add_comment(
    doc_id: str,
    data: CommentCreate,
    current_user: dict = Depends(require_permissions("documents:read")),
):
    """CU-19: Agregar comentario"""
    return await collab_service.add_comment(
        document_id=doc_id, user_id=current_user.get("sub"), text=data.text, position=data.position
    )


@router.post("/sessions/{doc_id}/close", response_model=MessageResponse)
async def close_session(
    doc_id: str,
    request: Request,
    current_user: dict = Depends(require_permissions("documents:write")),
):
    """CU-20: Cerrar sesión"""
    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["COLLAB_SESSION_END"],
        entity_type="document",
        entity_id=doc_id,
        ip_address=ip_address,
    )
    return MessageResponse(message="Session closed", status_code=200)
