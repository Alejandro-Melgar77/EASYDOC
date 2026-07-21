"""
sgdia/backend/app/schemas/auth.py

Esquemas Pydantic v2 para el módulo de autenticación.

Define los modelos de validación para:
- Solicitudes de login y registro
- Respuestas de tokens JWT
- Respuesta de datos de usuario
- Listado paginado de usuarios
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ── Solicitudes (Request) ────────────────────────────────────────


class LoginRequest(BaseModel):
    """Esquema de solicitud para iniciar sesión."""

    email: EmailStr = Field(
        ...,
        description="Correo electrónico del usuario",
        examples=["usuario@sgdia.com"],
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Contraseña del usuario",
        examples=["MiContraseña123!"],
    )

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: str) -> str:
        """Normaliza el email a minúsculas."""
        return v.lower().strip()


class RegisterRequest(BaseModel):
    """Esquema de solicitud para registrar un nuevo usuario."""

    email: EmailStr = Field(
        ...,
        description="Correo electrónico del nuevo usuario",
        examples=["nuevo.usuario@sgdia.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description=(
            "Contraseña (mínimo 8 caracteres, se recomienda incluir "
            "mayúsculas, minúsculas, números y caracteres especiales)"
        ),
        examples=["Segura#2024!"],
    )
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Nombre completo del usuario",
        examples=["Juan Pérez García"],
    )
    role_id: str | None = Field(
        default=None,
        description=(
            "ID del rol a asignar. Si no se proporciona se asigna "
            "el rol por defecto ('Usuario Final')."
        ),
        examples=["665a1b2c3d4e5f6789abcdef"],
    )

    @field_validator("email")
    @classmethod
    def email_to_lowercase(cls, v: str) -> str:
        """Normaliza el email a minúsculas."""
        return v.lower().strip()

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        """Elimina espacios en blanco innecesarios del nombre."""
        return " ".join(v.split())

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Valida que la contraseña cumpla requisitos mínimos de complejidad."""
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


# ── Respuestas de tokens (Response) ──────────────────────────────


class TokenResponse(BaseModel):
    """Respuesta con tokens JWT tras autenticación exitosa."""

    access_token: str = Field(
        ...,
        description="Token JWT de acceso",
    )
    refresh_token: str = Field(
        ...,
        description="Token JWT de refresco para obtener nuevos access tokens",
    )
    token_type: str = Field(
        default="bearer",
        description="Tipo de token (siempre 'bearer')",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    )


class RefreshTokenRequest(BaseModel):
    """Esquema de solicitud para refrescar un access token."""

    refresh_token: str = Field(
        ...,
        description="Token JWT de refresco válido",
    )


# ── Respuestas de usuario (Response) ─────────────────────────────


class UserResponse(BaseModel):
    """Representación pública de un usuario para respuestas de la API."""

    id: str = Field(
        ...,
        description="ID único del usuario",
        examples=["665a1b2c3d4e5f6789abcdef"],
    )
    email: EmailStr = Field(
        ...,
        description="Correo electrónico del usuario",
    )
    full_name: str = Field(
        ...,
        description="Nombre completo del usuario",
    )
    role: str | None = Field(
        default=None,
        description="Nombre del rol asignado",
    )
    is_active: bool = Field(
        ...,
        description="Indica si la cuenta está activa",
    )
    created_at: datetime = Field(
        ...,
        description="Fecha y hora de creación de la cuenta (UTC)",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "665a1b2c3d4e5f6789abcdef",
                "email": "usuario@sgdia.com",
                "full_name": "Juan Pérez García",
                "role": "Analista",
                "is_active": True,
                "created_at": "2024-06-01T12:00:00Z",
            }
        },
    )


class UserListResponse(BaseModel):
    """Respuesta paginada con lista de usuarios."""

    users: list[UserResponse] = Field(
        ...,
        description="Lista de usuarios en la página actual",
    )
    total: int = Field(
        ...,
        ge=0,
        description="Total de usuarios que coinciden con los filtros",
    )
    page: int = Field(
        ...,
        ge=1,
        description="Número de página actual",
    )
    page_size: int = Field(
        ...,
        ge=1,
        description="Cantidad de elementos por página",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "users": [
                    {
                        "id": "665a1b2c3d4e5f6789abcdef",
                        "email": "usuario@sgdia.com",
                        "full_name": "Juan Pérez",
                        "role": "Analista",
                        "is_active": True,
                        "created_at": "2024-06-01T12:00:00Z",
                    }
                ],
                "total": 42,
                "page": 1,
                "page_size": 20,
            }
        },
    )


class UserUpdate(BaseModel):
    """Esquema para actualizar datos de un usuario existente (PATCH)."""

    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=200,
        description="Nuevo nombre completo",
    )
    role_id: str | None = Field(
        default=None,
        description="Nuevo rol a asignar",
    )
    is_active: bool | None = Field(
        default=None,
        description="Estado de la cuenta (True=activo, False=desactivado)",
    )
    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
        description="Nueva contraseña (opcional)",
    )
