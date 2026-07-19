from datetime import datetime

from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    title: str
    description: str | None = None
    tags: list[str] = []
    folder_id: str | None = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    content_type: str
    size_bytes: int
    description: str | None
    tags: list[str]
    folder_id: str | None
    owner_id: str
    file_key: str
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class SearchQuery(BaseModel):
    query: str | None = None
    tags: list[str] | None = None
    folder_id: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    version: int
    file_key: str
    size_bytes: int
    created_by: str
    created_at: datetime
    change_summary: str | None


class PermissionUpdate(BaseModel):
    user_id: str | None = None
    role_id: str | None = None
    permission_level: str = Field(..., pattern="^(read|write|admin)$")


class FolderCreate(BaseModel):
    name: str
    parent_id: str | None = None


class FolderResponse(BaseModel):
    id: str
    name: str
    parent_id: str | None
    owner_id: str
    created_at: datetime


class OperationalRepositoryFolder(BaseModel):
    """Department or worker folder projected from workflow activity."""

    id: str
    name: str
    parent_id: str | None = None
    department: str | None = None
    is_synthetic: bool = False


class OperationalRepositoryEntry(BaseModel):
    """Trace entry for a document or task result stored by a worker."""

    id: str
    repository_id: str
    filename: str
    request_code: str | None = None
    department: str | None = None
    worker: str | None = None
    uploaded_by: str | None = None
    status: str | None = None
    stored_at: datetime | str | None = None
    is_synthetic: bool = False


class OperationalRepositoryResponse(BaseModel):
    folders: list[OperationalRepositoryFolder]
    entries: list[OperationalRepositoryEntry]
