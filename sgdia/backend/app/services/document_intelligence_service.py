"""Local-only extraction and classification for applicant attachments."""

from __future__ import annotations

import re
import unicodedata

from fastapi import UploadFile

from app.schemas.document_intelligence import DocumentIntelligenceResult, ExtractedField
from app.services.text_extraction import TextExtractionService


class DocumentIntelligenceService:
    """Extract conservative, explainable fields without calling external AI services."""

    async def analyze(self, file: UploadFile, content: bytes) -> DocumentIntelligenceResult:
        extraction = await TextExtractionService.extract_with_metadata(file, content)
        filename = file.filename or "adjunto"
        return self.analyze_text(
            extraction.text,
            filename,
            extraction_status=extraction.status,
            extraction_engine=extraction.engine,
            extraction_detail=extraction.detail,
            pages_processed=extraction.pages_processed,
        )

    @staticmethod
    def analyze_text(
        text: str,
        filename: str,
        extraction_status: str | None = None,
        extraction_engine: str | None = None,
        extraction_detail: str | None = None,
        pages_processed: int = 0,
    ) -> DocumentIntelligenceResult:
        """Build a reviewable extraction result from locally parsed text."""
        normalized = _normalize(f"{filename}\n{text}")
        document_type = _document_type(normalized)
        is_supported = filename.lower().endswith(
            (".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".txt")
        )
        if not is_supported:
            return DocumentIntelligenceResult(
                document_type="unsupported",
                extraction_status="unsupported",
                review_required=True,
                text_characters=0,
                extraction_engine="local_parser",
                extraction_detail="Formato no compatible con la extraccion local.",
                pages_processed=pages_processed,
            )
        if not text.strip():
            return DocumentIntelligenceResult(
                document_type=document_type,
                extraction_status=(
                    "ocr_unavailable" if extraction_status == "ocr_unavailable" else "no_text"
                ),
                review_required=True,
                text_characters=0,
                extraction_engine=extraction_engine or _default_engine(filename),
                extraction_detail=extraction_detail,
                pages_processed=pages_processed,
            )

        fields = _extract_fields(text)
        identity_expected = document_type == "identity_document"
        university_expected = document_type == "university_record"
        has_identity_key = any(field.name in {"identity_number", "full_name"} for field in fields)
        has_university_key = any(field.name == "university_id" for field in fields)
        review_required = (identity_expected and not has_identity_key) or (
            university_expected and not has_university_key
        )
        return DocumentIntelligenceResult(
            document_type=document_type,
            extraction_status="extracted",
            review_required=review_required,
            extracted_fields=fields,
            text_characters=len(text),
            extraction_engine=extraction_engine or _default_engine(filename),
            extraction_detail=extraction_detail,
            pages_processed=pages_processed,
        )


def _extract_fields(text: str) -> list[ExtractedField]:
    fields: list[ExtractedField] = []
    patterns = (
        ("email", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", 0.98),
        (
            "university_id",
            r"(?:registro|codigo|matricula)\s*(?:universitario|estudiantil)?\s*[:#-]?\s*([0-9]{6,12})",
            0.9,
        ),
        (
            "identity_number",
            r"(?:carnet|cedula|ci)\s*(?:de identidad)?\s*[:#-]?\s*([0-9]{5,12}(?:-[A-Za-z0-9]{1,3})?)",
            0.88,
        ),
        (
            "birth_date",
            r"(?:fecha de nacimiento|nacimiento)\s*[:#-]?\s*([0-3]?\d[/-][01]?\d[/-]\d{4})",
            0.84,
        ),
        ("gender", r"(?:sexo|genero)\s*[:#-]?\s*(masculino|femenino|otro)", 0.8),
        (
            "full_name",
            r"(?:nombre(?:s)?(?: completo)?)\s*[:#-]?\s*([A-Za-zA-ZÁÉÍÓÚÜÑáéíóúüñ ]{5,100})",
            0.78,
        ),
    )
    for name, pattern, confidence in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match is None:
            continue
        value = match.group(1) if match.lastindex else match.group(0)
        value = " ".join(value.strip(" .:-").split())
        if value:
            fields.append(
                ExtractedField(name=name, value=value, confidence=confidence, source="text_pattern")
            )
    return fields


def _document_type(normalized: str) -> str:
    if any(
        token in normalized for token in ("carnet", "cedula", "documento de identidad", "identidad")
    ):
        return "identity_document"
    if any(
        token in normalized
        for token in ("registro universitario", "historial academico", "materias aprobadas")
    ):
        return "university_record"
    if any(
        token in normalized
        for token in ("certificado", "programa analitico", "solicitud", "formulario")
    ):
        return "academic_document"
    return "generic_document"


def _is_image(filename: str) -> bool:
    return filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff", ".bmp"))


def _default_engine(filename: str) -> str:
    lowered = filename.lower()
    if lowered.endswith(".pdf"):
        return "local_pdf_parser"
    if lowered.endswith(".docx"):
        return "local_docx_parser"
    if lowered.endswith(".xlsx"):
        return "local_xlsx_parser"
    if _is_image(filename):
        return "local_image_ocr"
    return "local_text_parser"


def _normalize(value: str) -> str:
    return "".join(
        char
        for char in unicodedata.normalize("NFD", value.lower())
        if unicodedata.category(char) != "Mn"
    )
