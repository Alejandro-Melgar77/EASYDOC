from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.database import get_database
from app.core.dependencies import get_current_active_user, require_roles
from app.core.security import hash_password
from app.schemas.auth import UserListResponse, UserResponse
from app.schemas.common import MessageResponse
from app.schemas.users import UpdateUserRequest
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, description="Buscar por nombre o email"),
    role: str | None = Query(None, description="Filtrar por rol"),
    is_active: bool | None = Query(None, description="Filtrar por estado"),
    sort_by: str = Query("created_at", description="Campo de ordenamiento"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """Listar usuarios con paginación y filtros"""
    db = get_database()
    users_col = db["users"]

    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    if role:
        query["role_id"] = role
    if is_active is not None:
        query["is_active"] = is_active

    skip = (page - 1) * page_size
    sort_dir = 1 if sort_order == "asc" else -1

    total = await users_col.count_documents(query)
    cursor = users_col.find(query).sort(sort_by, sort_dir).skip(skip).limit(page_size)

    users = []
    async for user in cursor:
        user["id"] = str(user["_id"])
        users.append(UserResponse(**user))

    return UserListResponse(users=users, total=total, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_active_user)):
    """Obtener detalle de usuario"""
    if (
        current_user.get("role") not in ["admin", "Administrador"]
        and current_user.get("sub") != user_id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["id"] = str(user["_id"])
    return UserResponse(**user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Editar usuario"""
    if (
        current_user.get("role") not in ["admin", "Administrador"]
        and current_user.get("sub") != user_id
    ):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    db = get_database()
    users_col = db["users"]

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    result = await users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Log action
    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["USER_UPDATE"],
        entity_type="user",
        entity_id=user_id,
        details=list(update_data.keys()),
        ip_address=ip_address,
    )

    user = await users_col.find_one({"_id": ObjectId(user_id)})
    user["id"] = str(user["_id"])
    return UserResponse(**user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """Desactivar usuario (soft delete)"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    db = get_database()
    users_col = db["users"]

    result = await users_col.update_one({"_id": ObjectId(user_id)}, {"$set": {"is_active": False}})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Log action
    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["USER_DEACTIVATE"],
        entity_type="user",
        entity_id=user_id,
        ip_address=ip_address,
    )

    return MessageResponse(message="User deactivated successfully", status_code=200)
