"""
sgdia/backend/app/schemas/common.py

Esquemas Pydantic v2 reutilizables en todo el sistema SGDIA.

Define modelos comunes para:
- Parámetros de paginación
- Respuestas de éxito genéricas
- Respuestas de error estructuradas
"""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── Enumeraciones ────────────────────────────────────────────────


class SortOrder(str, Enum):
    """Orden de clasificación para consultas paginadas."""

    ASC = "asc"
    DESC = "desc"


# ── Paginación ───────────────────────────────────────────────────


class PaginationParams(BaseModel):
    """
    Parámetros de paginación reutilizables para endpoints de listado.

    Puede usarse como dependencia de FastAPI:
        async def list_items(params: PaginationParams = Depends()):
            skip = (params.page - 1) * params.page_size
            ...
    """

    page: int = Field(
        default=1,
        ge=1,
        description="Número de página (comienza en 1)",
        examples=[1],
    )
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Cantidad de elementos por página (máximo 100)",
        examples=[20],
    )
    sort_by: str | None = Field(
        default=None,
        max_length=50,
        description=(
            "Campo por el cual ordenar los resultados (ej: 'created_at', 'name', 'email')"
        ),
        examples=["created_at"],
    )
    sort_order: SortOrder = Field(
        default=SortOrder.DESC,
        description="Orden de clasificación: 'asc' o 'desc'",
    )

    @field_validator("sort_by")
    @classmethod
    def sanitize_sort_field(cls, v: str | None) -> str | None:
        """
        Sanitiza el campo de ordenamiento para prevenir inyección.
        Solo se permiten caracteres alfanuméricos y guion bajo.
        """
        if v is None:
            return v
        v = v.strip()
        if not v.replace("_", "").isalnum():
            raise ValueError(
                "El campo de ordenamiento solo puede contener letras, números y guiones bajos"
            )
        return v

    @property
    def skip(self) -> int:
        """Calcula el número de documentos a saltar para la paginación."""
        return (self.page - 1) * self.page_size

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "page": 1,
                "page_size": 20,
                "sort_by": "created_at",
                "sort_order": "desc",
            }
        }
    )


# ── Respuestas genéricas ────────────────────────────────────────


class MessageResponse(BaseModel):
    """
    Respuesta genérica de éxito con un mensaje descriptivo.

    Utilizada para operaciones que no retornan un recurso específico
    (ej: logout, eliminación, operaciones batch).
    """

    message: str = Field(
        ...,
        description="Mensaje descriptivo del resultado de la operación",
        examples=["Operación realizada exitosamente"],
    )
    status_code: int = Field(
        default=200,
        description="Código de estado HTTP",
        examples=[200],
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Operación realizada exitosamente",
                "status_code": 200,
            }
        }
    )


class FieldError(BaseModel):
    """Detalle de error en un campo específico (validación)."""

    field: str = Field(
        ...,
        description="Nombre del campo con error",
        examples=["email"],
    )
    message: str = Field(
        ...,
        description="Descripción del error en el campo",
        examples=["El formato del correo electrónico es inválido"],
    )


class ErrorResponse(BaseModel):
    """
    Respuesta de error estructurada.

    Compatible con el formato estándar de errores de FastAPI y
    opcionalmente incluye errores a nivel de campo para validación.
    """

    detail: str = Field(
        ...,
        description="Descripción general del error",
        examples=["Error de validación en los datos proporcionados"],
    )
    status_code: int = Field(
        ...,
        description="Código de estado HTTP",
        examples=[400],
    )
    errors: list[FieldError] | None = Field(
        default=None,
        description=(
            "Lista opcional de errores a nivel de campo (útil para errores de validación)"
        ),
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Error de validación en los datos proporcionados",
                "status_code": 422,
                "errors": [
                    {
                        "field": "email",
                        "message": "El formato del correo electrónico es inválido",
                    },
                    {
                        "field": "password",
                        "message": "La contraseña debe tener al menos 8 caracteres",
                    },
                ],
            }
        },
    )
