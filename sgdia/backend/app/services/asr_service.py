"""Offline speech recognition adapter used by report commands.

Vosk is optional because each institution must choose and keep its Spanish
acoustic model locally. The API never falls back to a cloud provider or
fabricates a transcription.
"""

from __future__ import annotations

import io
import json
import logging
import wave
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class LocalASRUnavailableError(RuntimeError):
    """Raised when a local recognizer or its model has not been configured."""


class ASRService:
    """Transcribe PCM WAV files through a locally installed Vosk model."""

    @staticmethod
    async def transcribe_audio(file: UploadFile, file_content: bytes) -> str:
        settings = get_settings()
        model_path = Path(settings.LOCAL_ASR_MODEL_PATH).expanduser()
        if not settings.LOCAL_ASR_MODEL_PATH or not model_path.is_dir():
            raise LocalASRUnavailableError(
                "Reconocimiento de voz local no configurado. Define LOCAL_ASR_MODEL_PATH con un modelo Vosk en espanol."
            )
        if not (file.filename or "").lower().endswith(".wav"):
            raise LocalASRUnavailableError(
                "El reconocimiento local acepta audio WAV PCM. Convierte la grabacion antes de enviarla."
            )
        try:
            from vosk import KaldiRecognizer, Model  # type: ignore[import-not-found]
        except ImportError as exc:
            raise LocalASRUnavailableError(
                "El paquete Vosk no esta instalado en el backend local."
            ) from exc

        try:
            with wave.open(io.BytesIO(file_content), "rb") as audio:
                if audio.getnchannels() != 1 or audio.getsampwidth() != 2:
                    raise LocalASRUnavailableError("El audio debe ser WAV mono PCM de 16 bits.")
                recognizer = KaldiRecognizer(Model(str(model_path)), audio.getframerate())
                fragments: list[str] = []
                while chunk := audio.readframes(4_000):
                    if recognizer.AcceptWaveform(chunk):
                        fragment = json.loads(recognizer.Result()).get("text", "").strip()
                        if fragment:
                            fragments.append(fragment)
                final_fragment = json.loads(recognizer.FinalResult()).get("text", "").strip()
                if final_fragment:
                    fragments.append(final_fragment)
        except wave.Error as exc:
            raise LocalASRUnavailableError("No fue posible leer el archivo WAV local.") from exc

        transcription = " ".join(fragments).strip()
        if not transcription:
            raise LocalASRUnavailableError("El motor local no detecto una instruccion de voz util.")
        logger.info("Local Vosk transcription completed for %s", file.filename)
        return transcription
