"""
sgdia/backend/app/models/conversation.py

Schema Beanie para la colección `conversations`.
Registra diálogos entre usuarios y el agente IA.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

from .base import BaseDocument


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class Message(BaseModel):
    sender_id: str = Field(..., description="ID del remitente (usuario o agente)")
    content: str = Field(..., description="Texto del mensaje")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    role: str = Field(..., description="'user' o 'assistant'")


class Conversation(BaseDocument):
    """
    Colección: conversations

    Campos:
        user_id   — ID del usuario propietario de la conversación
        title     — Título breve
        messages  — Lista de mensajes (ordenados cronológicamente)
        status    — active | closed | archived
        escalated — Booleano indica si se escaló a soporte humano
        escalated_to — ID del agente o grupo al que se escaló (nullable)
    """

    user_id: str = Field(..., description="Usuario propietario")
    title: str | None = Field(default=None)
    messages: list[Message] = Field(default_factory=list)
    status: ConversationStatus = Field(default=ConversationStatus.ACTIVE)
    escalated: bool = Field(default=False)
    escalated_to: str | None = Field(default=None)

    class Settings:
        name = "conversations"
        indexes = [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)]),
            IndexModel([("is_deleted", ASCENDING)]),
        ]
