# Vista de Procesos (Comportamiento Dinámico PUDS)

La Vista de Procesos se centra en el comportamiento en tiempo de ejecución, detallando cómo se comunican los objetos, la concurrencia y la sincronización (asincronismo).

## 1. Diagrama de Secuencia: Flujo RAG (Chat con Documento)

Este diagrama modela la comunicación asíncrona entre el cliente, el backend, la base de datos vectorial (MongoDB) y el LLM.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario (Frontend)
    participant API as FastAPI (Backend)
    participant Redis as Redis (Rate Limit/Cache)
    participant Mongo as MongoDB (Vector Search)
    participant LLM as API Externa (OpenAI/Claude)
    
    User->>API: POST /agent/chat {query, doc_id}
    API->>Redis: Check Rate Limit (JWT)
    Redis-->>API: OK
    
    API->>API: Convertir query a Vector (Embedding)
    API->>Mongo: Búsqueda Vectorial (KNN en doc_id)
    Mongo-->>API: Top K Fragmentos de Texto
    
    API->>API: Construir Prompt RAG
    API->>LLM: Enviar Prompt + Contexto
    
    activate LLM
    LLM-->>API: Stream Tokens (Server-Sent Events)
    deactivate LLM
    
    loop Streaming
        API-->>User: Enviar token parcial vía WebSocket / SSE
    end
    
    API->>Mongo: Guardar historial de conversación
```

## 2. Diagrama de Actividad: Procesamiento Asíncrono de un Documento (Celery)

Al subir un archivo pesado, la interfaz responde rápido y el procesamiento se delega a Background Workers.

```mermaid
stateDiagram-v2
    [*] --> Upload_Request: Frontend envía PDF
    Upload_Request --> Validacion: API valida JWT y tamaño
    
    state Validacion {
        [*] --> Error: Invalido
        [*] --> Guardar_S3: Valido
    }
    Error --> [*]
    
    Guardar_S3 --> Celery_Queue: Encolar Tarea (RabbitMQ)
    Celery_Queue --> Respuesta_Rapida: HTTP 202 Accepted al Frontend
    
    state Tarea_Celery {
        Extraer_Texto --> Generar_Embedding
        Generar_Embedding --> Generar_Preview
    }
    
    Respuesta_Rapida --> Frontend_Polling
    Celery_Queue --> Extraer_Texto: Worker consume tarea
    Generar_Preview --> MongoDB: Actualizar estado a "PROCESADO"
    
    MongoDB --> WebSocket: Emitir Notificación "Documento Listo"
    WebSocket --> Frontend_Polling: Refrescar UI
```
