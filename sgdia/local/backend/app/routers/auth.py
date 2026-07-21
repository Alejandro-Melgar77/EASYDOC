from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.dependencies import get_current_user, require_roles
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: RegisterRequest,
    request: Request,
    current_user: dict = Depends(require_roles("admin", "Administrador")),
):
    """CU-01: Registrar nuevo usuario (solo administradores)"""
    ip_address = getattr(request.state, "ip_address", None)
    user_id = current_user.get("sub")
    return await AuthService.register_user(data, created_by=user_id, ip_address=ip_address)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request):
    """CU-02: Iniciar sesión con credenciales"""
    ip_address = getattr(request.state, "ip_address", None)
    return await AuthService.authenticate(data.email, data.password, ip_address=ip_address)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    token: str = Depends(oauth2_scheme),
    current_user: dict = Depends(get_current_user),
):
    """CU-04: Cerrar sesión e invalidar token"""
    ip_address = getattr(request.state, "ip_address", None)
    user_id = current_user.get("sub")
    await AuthService.logout(token, user_id=user_id, ip_address=ip_address)
    return MessageResponse(message="Logged out successfully", status_code=200)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshTokenRequest):
    """Renovar token de acceso"""
    return await AuthService.refresh_token(data.refresh_token)
