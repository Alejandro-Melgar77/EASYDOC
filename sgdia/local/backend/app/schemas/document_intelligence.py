"""Contracts for local document extraction with mandatory human review cues."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExtractedField(BaseModel):
    name: str
    value: str
    confidence: float = Field(ge=0, le=1)
    source: Literal["text_pattern", "file_metadata"]


class DocumentIntelligenceResult(BaseModel):
    document_type: Literal[
        "identity_document",
        "university_record",
        "academic_document",
        "generic_document",
        "unsupported",
    ]
    extraction_status: Literal["extracted", "no_text", "ocr_unavailable", "unsupported"]
    review_required: bool
    extracted_fields: list[ExtractedField] = Field(default_factory=list)
    text_characters: int = Field(ge=0)
    extraction_engine: Literal[
        "local_text_parser",
        "local_pdf_parser",
        "local_pdf_ocr",
        "local_docx_parser",
        "local_xlsx_parser",
        "local_image_ocr",
        "local_ocr_unavailable",
        "local_parser",
        "local_ocr",
    ]
    extraction_detail: str | None = None
    pages_processed: int = Field(default=0, ge=0)
