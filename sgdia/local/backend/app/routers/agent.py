import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.schemas.agent import (
    AgentQueryRequest,
    AgentQueryResponse,
    EscalateRequest,
    FeedbackRequest,
)
from app.schemas.common import MessageResponse
from app.services.asr_service import ASRService
from app.services.audit_service import AuditService
from app.services.ocr_service import OCRService
from app.services.rag_engine import RAGEngine

router = APIRouter(prefix="/agent", tags=["Agente IA"])
rag_engine = RAGEngine()


@router.post("/chat", response_model=AgentQueryResponse)
async def chat(
    data: AgentQueryRequest,
    request: Request,
    current_user: dict = Depends(require_permissions("agent:use")),
):
    """CU-21: Consulta de texto con RAG"""
    conversation_id = data.conversation_id or str(uuid.uuid4())

    # 1. Process query with RAG
    response_text, sources = await rag_engine.query(data.query, data.context_filters)

    # 2. Save to history
    db = get_database()
    history_col = db["agent_history"]

    await history_col.insert_one(
        {
            "conversation_id": conversation_id,
            "user_id": current_user["sub"],
            "query": data.query,
            "response": response_text,
            "sources": sources,
            "timestamp": datetime.now(UTC),
        }
    )

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["AGENT_QUERY"],
        entity_type="agent_conversation",
        entity_id=conversation_id,
        details={"type": "text", "query_length": len(data.query)},
        ip_address=ip_address,
    )

    return AgentQueryResponse(
        response=response_text, conversation_id=conversation_id, sources=sources
    )


@router.post("/audio", response_model=AgentQueryResponse)
async def chat_audio(
    request: Request,
    audio: UploadFile = File(...),
    conversation_id: str = Form(None),
    current_user: dict = Depends(require_permissions("agent:use")),
):
    """CU-22: Consulta por voz (Audio -> Texto -> RAG)"""
    conversation_id = conversation_id or str(uuid.uuid4())
    content = await audio.read()

    # 1. Transcribe
    transcription = await ASRService.transcribe_audio(audio, content)

    # 2. Process with RAG
    response_text, sources = await rag_engine.query(transcription)

    # 3. Save to history
    db = get_database()
    history_col = db["agent_history"]

    await history_col.insert_one(
        {
            "conversation_id": conversation_id,
            "user_id": current_user["sub"],
            "query": transcription,
            "is_audio": True,
            "response": response_text,
            "sources": sources,
            "timestamp": datetime.now(UTC),
        }
    )

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["AGENT_QUERY"],
        entity_type="agent_conversation",
        entity_id=conversation_id,
        details={"type": "audio"},
        ip_address=ip_address,
    )

    return AgentQueryResponse(
        response=response_text, conversation_id=conversation_id, sources=sources
    )


@router.post("/document", response_model=AgentQueryResponse)
async def chat_document(
    request: Request,
    query: str = Form(...),
    file: UploadFile = File(...),
    conversation_id: str = Form(None),
    current_user: dict = Depends(require_permissions("agent:use")),
):
    """CU-23: Consulta adjuntando un documento"""
    conversation_id = conversation_id or str(uuid.uuid4())
    content = await file.read()

    # 1. Extract text
    doc_text = await OCRService.extract_text_from_document(file, content)

    # 2. Augment query
    augmented_query = f"{query}\n\n[Documento Adjunto: {file.filename}]\n{doc_text[:2000]}"

    # 3. Process with RAG
    response_text, sources = await rag_engine.query(augmented_query)

    # 4. Save
    db = get_database()
    history_col = db["agent_history"]

    await history_col.insert_one(
        {
            "conversation_id": conversation_id,
            "user_id": current_user["sub"],
            "query": query,
            "attached_file": file.filename,
            "response": response_text,
            "sources": sources,
            "timestamp": datetime.now(UTC),
        }
    )

    return AgentQueryResponse(
        response=response_text, conversation_id=conversation_id, sources=sources
    )


@router.get("/conversations")
async def list_conversations(current_user: dict = Depends(require_permissions("agent:use"))):
    """CU-24: Historial de conversaciones del usuario"""
    db = get_database()
    history_col = db["agent_history"]

    # Group by conversation_id
    pipeline = [
        {"$match": {"user_id": current_user["sub"]}},
        {"$sort": {"timestamp": 1}},
        {
            "$group": {
                "_id": "$conversation_id",
                "first_query": {"$first": "$query"},
                "started_at": {"$first": "$timestamp"},
                "messages_count": {"$sum": 1},
            }
        },
        {"$sort": {"started_at": -1}},
    ]

    cursor = history_col.aggregate(pipeline)
    conversations = []
    async for conv in cursor:
        conversations.append(conv)

    return conversations


@router.post("/feedback/{conversation_id}", response_model=MessageResponse)
async def submit_feedback(
    conversation_id: str,
    data: FeedbackRequest,
    current_user: dict = Depends(require_permissions("agent:use")),
):
    """CU-25: Retroalimentación sobre la respuesta"""
    db = get_database()
    feedback_col = db["agent_feedback"]

    await feedback_col.insert_one(
        {
            "conversation_id": conversation_id,
            "user_id": current_user["sub"],
            "rating": data.rating,
            "comments": data.comments,
            "timestamp": datetime.now(UTC),
        }
    )

    return MessageResponse(message="Feedback submitted successfully", status_code=200)


@router.post("/escalate/{conversation_id}", response_model=MessageResponse)
async def escalate_to_human(
    conversation_id: str,
    data: EscalateRequest,
    request: Request,
    current_user: dict = Depends(require_permissions("agent:use")),
):
    """CU-26: Escalar conversación a un humano"""
    db = get_database()
    escalations_col = db["escalations"]

    await escalations_col.insert_one(
        {
            "conversation_id": conversation_id,
            "user_id": current_user["sub"],
            "reason": data.reason,
            "status": "pending",
            "timestamp": datetime.now(UTC),
        }
    )

    ip_address = getattr(request.state, "ip_address", None)
    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["AGENT_ESCALATE"],
        entity_type="agent_conversation",
        entity_id=conversation_id,
        details={"reason": data.reason},
        ip_address=ip_address,
    )

    return MessageResponse(message="Conversation escalated to human agent", status_code=200)
