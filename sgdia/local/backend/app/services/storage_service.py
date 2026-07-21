"""
Refactoring: storage_service.py

Bug crítico corregido: el método `upload_file` ya no llama a `file.read()`
internamente — recibe los bytes pre-leídos del caller para evitar el problema
de doble lectura de UploadFile.
"""

import logging
import uuid

import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        settings = get_settings()
        self.bucket_name = settings.S3_BUCKET_NAME

        access_key = settings.S3_ACCESS_KEY or settings.AWS_ACCESS_KEY_ID
        secret_key = settings.S3_SECRET_KEY or settings.AWS_SECRET_ACCESS_KEY
        client_options = {
            "aws_access_key_id": access_key,
            "aws_secret_access_key": secret_key,
            "region_name": settings.AWS_REGION,
        }
        if settings.S3_ENDPOINT:
            client_options["endpoint_url"] = settings.S3_ENDPOINT

        if access_key and secret_key:
            self.s3_client = boto3.client(
                "s3",
                **client_options,
            )
        else:
            # Fallback MinIO local
            self.s3_client = boto3.client(
                "s3",
                endpoint_url="http://localhost:9000",
                aws_access_key_id="minioadmin",
                aws_secret_access_key="minioadmin",
                region_name="us-east-1",
            )

    async def upload_file_bytes(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        folder_path: str = "",
    ) -> str:
        """
        Sube bytes de archivo a S3/MinIO y devuelve la clave (key).

        Args:
            file_content: Contenido en bytes del archivo (ya leído por el caller).
            filename: Nombre original del archivo (para inferir extensión).
            content_type: MIME type del archivo.
            folder_path: Prefijo de directorio dentro del bucket.

        Returns:
            file_key: Clave S3 del objeto creado.
        """
        try:
            extension = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
            file_key = f"{folder_path}{uuid.uuid4()}.{extension}"

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type,
            )
            logger.info("Uploaded file to S3: %s", file_key)
            return file_key

        except ClientError as exc:
            logger.error("S3 Upload Error: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        """Genera URL prefirmada para descarga directa."""
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": file_key},
                ExpiresIn=expires_in,
            )
            return url
        except ClientError as exc:
            logger.error("S3 Presigned URL Error: %s", exc)
            raise HTTPException(status_code=500, detail="Failed to generate download URL")

    def delete_file(self, file_key: str) -> bool:
        """Elimina un archivo de S3/MinIO."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError as exc:
            logger.error("S3 Delete Error: %s", exc)
            return False
