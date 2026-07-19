"""Guest service request and authenticated staff task API."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from pymongo import ReturnDocument

from app.core.database import get_database
from app.core.dependencies import get_current_active_user, require_roles
from app.schemas.guidance import PublicGuidanceRequest, PublicGuidanceResponse
from app.schemas.requests import (
    AttachmentResponse,
    DeviceRegistration,
    DeviceRegistrationResponse,
    FinalResponseApproval,
    FinalResponseApprovalResponse,
    GuestRequestCreate,
    GuestRequestReceipt,
    PublicServiceListResponse,
    PublicServiceSummary,
    RequestAttachmentMetadata,
    RequestTrackingResponse,
    StaffTaskListResponse,
    StaffTaskResponse,
    TaskStatusUpdate,
)
from app.services.audit_service import AuditService
from app.services.document_intelligence_service import DocumentIntelligenceService
from app.services.notification_service import NotificationService
from app.services.public_guidance_service import PublicGuidanceService
from app.services.request_service import (
    RequestAccessDeniedError,
    RequestNotFoundError,
    RequestService,
    TaskAccessDeniedError,
    TaskNotFoundError,
)
from app.services.storage_service import StorageService

public_router = APIRouter(prefix="/public", tags=["Tramites publicos"])
staff_router = APIRouter(tags=["Tareas y dispositivos"])
request_service = RequestService()
storage_service = StorageService()
guidance_service = PublicGuidanceService()
document_intelligence_service = DocumentIntelligenceService()


def _not_found() -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tramite no encontrado")


@public_router.get("/services", response_model=PublicServiceListResponse)
async def list_public_services() -> PublicServiceListResponse:
    services = await request_service.list_public_services()
    return PublicServiceListResponse(
        services=[PublicServiceSummary(**service) for service in services]
    )


@public_router.get("/services/{policy_id}", response_model=PublicServiceSummary)
async def get_public_service(policy_id: str) -> PublicServiceSummary:
    try:
        return PublicServiceSummary(**await request_service.public_service(policy_id))
    except RequestNotFoundError:
        _not_found()


@public_router.post("/guide", response_model=PublicGuidanceResponse)
async def guide_guest(data: PublicGuidanceRequest) -> PublicGuidanceResponse:
    """Recommend a published policy through the local/offline guidance corpus."""
    return await guidance_service.advise(data.query)


@public_router.post(
    "/services/{policy_id}/requests",
    response_model=GuestRequestReceipt,
    status_code=status.HTTP_201_CREATED,
)
async def create_public_request(
    policy_id: str, data: GuestRequestCreate, request: Request
) -> GuestRequestReceipt:
    try:
        receipt = await request_service.create_request(policy_id, data)
    except RequestNotFoundError:
        _not_found()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await AuditService.log_action(
        user_id=None,
        action="public_request_create",
        entity_type="service_request",
        entity_id=receipt["tracking_code"],
        ip_address=getattr(request.state, "ip_address", None),
        details={"policy_id": policy_id},
    )
    return GuestRequestReceipt(**receipt)


@public_router.post(
    "/requests/{tracking_code}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_public_request_attachment(
    tracking_code: str,
    file: UploadFile = File(...),
    receipt_pin: str = Form(..., min_length=8, max_length=8),
    metadata: str = Form(...),
) -> AttachmentResponse:
    try:
        requirement = RequestAttachmentMetadata.model_validate(json.loads(metadata))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Metadatos de adjunto invalidos"
        ) from exc

    try:
        content = await file.read()
        intelligence = await document_intelligence_service.analyze(file, content)
        file_key = await storage_service.upload_file_bytes(
            file_content=content,
            filename=file.filename or "adjunto",
            content_type=file.content_type or "application/octet-stream",
            folder_path=f"public-requests/{tracking_code.upper()}/",
        )
        attachment = await request_service.add_attachment(
            tracking_code,
            receipt_pin,
            requirement.requirement_id,
            {
                "filename": file.filename or "adjunto",
                "content_type": file.content_type or "application/octet-stream",
                "size_bytes": len(content),
                "file_key": file_key,
                "intelligence": intelligence.model_dump(),
            },
        )
    except RequestNotFoundError:
        _not_found()
    except RequestAccessDeniedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN de recibo invalido")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return AttachmentResponse(**attachment)


@public_router.get("/requests/{tracking_code}", response_model=RequestTrackingResponse)
async def track_public_request(tracking_code: str, receipt_pin: str) -> RequestTrackingResponse:
    try:
        return RequestTrackingResponse(
            **await request_service.request_for_tracking(tracking_code, receipt_pin)
        )
    except RequestNotFoundError:
        _not_found()
    except RequestAccessDeniedError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN de recibo invalido")


@staff_router.get("/tasks/me", response_model=StaffTaskListResponse)
async def list_my_tasks(
    current_user: dict = Depends(get_current_active_user),
) -> StaffTaskListResponse:
    tasks = await request_service.assigned_tasks(current_user["sub"])
    return StaffTaskListResponse(tasks=[StaffTaskResponse(**task) for task in tasks])


@staff_router.patch("/tasks/{task_id}/status", response_model=StaffTaskResponse)
async def update_my_task(
    task_id: str,
    data: TaskStatusUpdate,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
) -> StaffTaskResponse:
    try:
        updated = await request_service.update_task(task_id, current_user["sub"], data)
    except TaskNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    except TaskAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="La tarea no pertenece al usuario"
        )
    except RequestNotFoundError:
        _not_found()

    await AuditService.log_action(
        user_id=current_user["sub"],
        action="workflow_task_update",
        entity_type="workflow_task",
        entity_id=task_id,
        details={"status": data.status},
        ip_address=getattr(request.state, "ip_address", None),
    )
    next_assignee_ids = {
        assignee_id
        for assignee_id in updated.get("next_task_assignee_ids", [])
        if isinstance(assignee_id, str) and assignee_id
    }
    for next_assignee_id in next_assignee_ids:
        await NotificationService().send_in_app(
            user_id=next_assignee_id,
            title="Nueva tarea asignada",
            body=f"{updated['tracking_code']}: {updated['title']}",
            notif_type="info",
            entity_type="service_request",
            entity_id=updated["request_id"],
        )
    return StaffTaskResponse(**updated)


@staff_router.post(
    "/requests/{request_id}/final-response/approve",
    response_model=FinalResponseApprovalResponse,
)
async def approve_final_response(
    request_id: str,
    data: FinalResponseApproval,
    request: Request,
    current_user: dict = Depends(require_roles("Administrador", "Director", "Gerente")),
) -> FinalResponseApprovalResponse:
    """Publish the final answer of a sensitive academic request after hierarchical review."""
    try:
        result = await request_service.approve_final_response(
            request_id, current_user["sub"], data.message
        )
    except RequestNotFoundError:
        _not_found()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    await AuditService.log_action(
        user_id=current_user["sub"],
        action="workflow_final_response_approved",
        entity_type="service_request",
        entity_id=request_id,
        ip_address=getattr(request.state, "ip_address", None),
    )
    return FinalResponseApprovalResponse(
        tracking_code=result["tracking_code"],
        status=result["status"],
        final_response=result["message"],
        published_at=result["published_at"],
    )


@staff_router.post(
    "/devices", response_model=DeviceRegistrationResponse, status_code=status.HTTP_201_CREATED
)
async def register_device(
    data: DeviceRegistration, current_user: dict = Depends(get_current_active_user)
) -> DeviceRegistrationResponse:
    now = datetime.now(UTC)
    import hashlib

    token_hash = hashlib.sha256(data.token.encode("utf-8")).hexdigest()
    result = await get_database()["mobile_devices"].find_one_and_update(
        {"token_hash": token_hash},
        {
            "$set": {
                "user_id": current_user["sub"],
                "token": data.token,
                "platform": data.platform,
                "device_name": data.device_name,
                "updated_at": now,
                "is_active": True,
            },
            "$setOnInsert": {"registered_at": now, "token_hash": token_hash},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return DeviceRegistrationResponse(
        id=str(result["_id"]), platform=result["platform"], registered_at=result["registered_at"]
    )


@staff_router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(
    device_id: str, current_user: dict = Depends(get_current_active_user)
) -> None:
    if not ObjectId.is_valid(device_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo no encontrado"
        )
    result = await get_database()["mobile_devices"].update_one(
        {"_id": ObjectId(device_id), "user_id": current_user["sub"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(UTC)}},
    )
    if not result.matched_count:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Dispositivo no encontrado"
        )
