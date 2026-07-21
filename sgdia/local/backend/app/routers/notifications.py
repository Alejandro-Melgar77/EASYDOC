from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_database
from app.core.dependencies import get_current_active_user
from app.schemas.common import MessageResponse
from app.schemas.notifications import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notificaciones"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
):
    """CU-37: Lista notificaciones del usuario con soporte de paginación."""
    db = get_database()
    query: dict = {"user_id": current_user["sub"]}
    if unread_only:
        query["is_read"] = False

    skip = (page - 1) * page_size
    notifs = []
    async for n in (
        db["notifications"].find(query).sort("created_at", -1).skip(skip).limit(page_size)
    ):
        n["id"] = str(n["_id"])
        notifs.append(NotificationResponse(**n))
    return notifs


@router.patch("/{notif_id}/read", response_model=MessageResponse)
async def mark_as_read(
    notif_id: str,
    current_user: dict = Depends(get_current_active_user),
):
    """Marca una notificación como leída."""
    db = get_database()
    result = await db["notifications"].update_one(
        {"_id": ObjectId(notif_id), "user_id": current_user["sub"]},
        {"$set": {"is_read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return MessageResponse(message="Notification marked as read", status_code=200)


@router.patch("/read-all", response_model=MessageResponse)
async def mark_all_as_read(current_user: dict = Depends(get_current_active_user)):
    """Marca todas las notificaciones del usuario como leídas."""
    db = get_database()
    await db["notifications"].update_many(
        {"user_id": current_user["sub"], "is_read": False},
        {"$set": {"is_read": True}},
    )
    return MessageResponse(message="All notifications marked as read", status_code=200)
