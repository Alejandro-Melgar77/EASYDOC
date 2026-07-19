"""
Módulo de configuración central del sistema SGDIA.

Utiliza Pydantic Settings v2 para cargar variables de entorno
desde archivo .env y proporciona un patrón singleton mediante lru_cache.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuración global de la aplicación SGDIA.

    Todas las variables se cargan desde el archivo .env o desde
    variables de entorno del sistema. Los valores por defecto
    permiten ejecutar el proyecto en modo desarrollo sin configuración
    adicional.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Aplicación ───────────────────────────────────────────────
    APP_NAME: str = "EASYDOC"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"

    # ── MongoDB ──────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "sgdia"

    # ── Redis ────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6380/0"

    # ── JWT / Autenticación ──────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas

    # ── AWS / S3 ─────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "sgdia-documents"

    # ── Celery ───────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6380/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6380/2"

    # ── OnlyOffice ───────────────────────────────────────────────
    ONLYOFFICE_URL: str = "http://localhost:8080"

    # ── SMTP / Correo electrónico ────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_TLS: bool = True

    # ── LLM / IA ─────────────────────────────────────────────────
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LOCAL_ASR_MODEL_PATH: str = ""
    LOCAL_ASR_LANGUAGE: str = "es"

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4200",
    ]

    # ── Seguridad / Rate-limiting ────────────────────────────────
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 30


@lru_cache
def get_settings() -> Settings:
    """
    Devuelve una instancia *singleton* de Settings.

    Gracias a ``lru_cache`` la configuración se lee del entorno una
    única vez y se reutiliza en todas las llamadas posteriores.
    """
    return Settings()  # type: ignore[call-arg]
