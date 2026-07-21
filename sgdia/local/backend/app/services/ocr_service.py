import logging

from fastapi import UploadFile

from app.services.text_extraction import TextExtractionService

logger = logging.getLogger(__name__)


class OCRService:
    @staticmethod
    async def extract_text_from_document(file: UploadFile, file_content: bytes) -> str:
        """CU-23: Doc adjunto -> texto (Reuses TextExtractionService)"""
        logger.info(f"Extracting text via OCR/Parser from file: {file.filename}")
        return await TextExtractionService.extract_text(file, file_content)
