from datetime import UTC, datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.database import get_database
from app.core.dependencies import require_roles
from app.schemas.common import MessageResponse
from app.schemas.roles import CreateRoleRequest, RoleListResponse, RoleResponse, UpdateRoleRequest
from app.services.audit_service import AuditService

router = APIRouter(prefix="/roles", tags=["Roles y Permisos"])


@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(
    data: CreateRoleRequest,
    request: Request,
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """Crear nuevo rol con permisos por módulo"""
    db = get_database()
    roles_col = db["roles"]

    existing = await roles_col.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")

    role_doc = {
        "name": data.name,
        "description": data.description,
        "permissions": [p.model_dump() for p in data.permissions],
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await roles_col.insert_one(role_doc)
    role_doc["_id"] = str(result.inserted_id)
    role_doc["id"] = role_doc["_id"]

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["ROLE_CREATE"],
        entity_type="role",
        entity_id=role_doc["id"],
        ip_address=ip_address,
    )

    return RoleResponse(**role_doc)


@router.get("/", response_model=RoleListResponse)
async def list_roles(current_user: dict = Depends(require_roles("admin", "Administrador"))):
    """Listar todos los roles"""
    db = get_database()
    roles_col = db["roles"]

    total = await roles_col.count_documents({})
    cursor = roles_col.find({}).sort("name", 1)

    roles = []
    async for role in cursor:
        role["id"] = str(role["_id"])
        roles.append(RoleResponse(**role))

    return RoleListResponse(roles=roles, total=total)


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str, current_user: dict = Depends(require_roles("admin", "Administrador"))
):
    """Obtener detalle de rol"""
    if not ObjectId.is_valid(role_id):
        raise HTTPException(status_code=400, detail="Invalid role ID")

    db = get_database()
    role = await db["roles"].find_one({"_id": ObjectId(role_id)})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    role["id"] = str(role["_id"])
    return RoleResponse(**role)


@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: UpdateRoleRequest,
    request: Request,
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """Actualizar rol y permisos"""
    if not ObjectId.is_valid(role_id):
        raise HTTPException(status_code=400, detail="Invalid role ID")

    db = get_database()
    roles_col = db["roles"]

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data["updated_at"] = datetime.now(UTC)
    if "permissions" in update_data:
        # TODO: Invalidate Redis cache for affected permissions
        pass

    result = await roles_col.update_one({"_id": ObjectId(role_id)}, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["ROLE_UPDATE"],
        entity_type="role",
        entity_id=role_id,
        ip_address=ip_address,
    )

    role = await roles_col.find_one({"_id": ObjectId(role_id)})
    role["id"] = str(role["_id"])
    return RoleResponse(**role)


@router.delete("/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: str,
    request: Request,
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """Eliminar rol (bloquear eliminación del rol Administrador)"""
    if not ObjectId.is_valid(role_id):
        raise HTTPException(status_code=400, detail="Invalid role ID")

    db = get_database()
    roles_col = db["roles"]
    users_col = db["users"]

    role = await roles_col.find_one({"_id": ObjectId(role_id)})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.get("name") in ["Administrador", "admin"]:
        raise HTTPException(status_code=400, detail="Cannot delete Administrador role")

    users_with_role = await users_col.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail="Cannot delete role assigned to users")

    await roles_col.delete_one({"_id": ObjectId(role_id)})

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user.get("sub"),
        action=AuditService.ACTIONS["ROLE_DELETE"],
        entity_type="role",
        entity_id=role_id,
        ip_address=ip_address,
    )

    return MessageResponse(message="Role deleted successfully", status_code=200)
