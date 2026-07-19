# Documento de Arquitectura de Software (SAD)
## Sistema de Gestión Documental con Inteligencia Artificial (SGDIA)

**Metodología:** Proceso Unificado de Desarrollo de Software (PUDS) / RUP
**Enfoque Arquitectónico:** Vistas "4+1" de Kruchten

Este documento actúa como el entregable central de la arquitectura del sistema SGDIA, referenciando todas las fases de la metodología PUDS.

---

## 1. Introducción
El SGDIA es una plataforma empresarial híbrida (Web/Móvil) diseñada para la gestión, almacenamiento, coedición y análisis predictivo de documentos. Integra un motor de inteligencia artificial (RAG + DL) y está construido sobre una arquitectura de microservicios orientada a eventos.

## 2. Metas y Restricciones Arquitectónicas
*   **Disponibilidad:** Arquitectura cloud-ready (despliegue en contenedores).
*   **Escalabilidad:** Separación estricta entre el procesamiento pesado (Celery/ML) y la API REST síncrona.
*   **Rendimiento:** Caché en memoria con Redis y Búsqueda Vectorial nativa.
*   **Seguridad:** RBAC granular, JWT y auditoría inmutable de 2 años.

---

## FASE 1: Vista de Casos de Uso (Modelo de Casos de Uso PUDS)

Esta vista describe la funcionalidad del sistema desde la perspectiva de sus actores. Abarca los 40 Casos de Uso (CU) definidos en los requisitos, agrupados por módulos.

### 1.1. Actores del Sistema
*   **Administrador:** Gestiona usuarios, roles, seguridad y métricas globales.
*   **Usuario Estándar:** Sube, edita, busca y colabora en documentos.
*   **Agente IA (Actor Sistema):** Procesa texto, asiste en chat y analiza datos.

### 1.2. Diagrama de Casos de Uso General (Nivel Subsistema)

```mermaid
usecaseDiagram
    actor Admin as "Administrador"
    actor User as "Usuario"
    actor AI as "Motor IA"

    package "Módulos SGDIA" {
        usecase UC_Auth as "1. Gestión y Auth (CU01-04)"
        usecase UC_Repo as "2. Repositorio (CU11-16)"
        usecase UC_Collab as "3. Edición Colaborativa (CU17-20)"
        usecase UC_UML as "4. Diagramador y Flujos (CU05-10)"
        usecase UC_IA as "5. Chat y Asistencia IA (CU21-26)"
        usecase UC_ML as "6. Predicción ML (CU27-31)"
        usecase UC_Rep as "7. Reportes Dinámicos (CU32-36)"
        usecase UC_Notif as "8. Auditoría y Notif (CU37-40)"
    }

    User --> UC_Auth
    User --> UC_Repo
    User --> UC_Collab
    User --> UC_UML
    User --> UC_IA
    User --> UC_Rep
    
    Admin --> UC_Auth
    Admin --> UC_Notif
    Admin --> UC_ML
    
    AI --> UC_IA
    AI --> UC_ML
    AI --> UC_Collab : "Sugiere contenido"
```

### 1.3. Detalle de Paquetes de Casos de Uso

#### Paquete: Repositorio e IA
```mermaid
usecaseDiagram
    actor Usuario
    usecase U11 as "Subir Documento (CU-11)"
    usecase U12 as "Búsqueda Semántica (CU-12)"
    usecase U13 as "Control de Versiones (CU-13)"
    usecase U21 as "Chat con Documento (CU-21)"
    usecase U22 as "Extraer Texto OCR (CU-22)"

    Usuario --> U11
    Usuario --> U12
    Usuario --> U13
    Usuario --> U21
    
    U11 ..> U22 : <<include>>
    U21 ..> U12 : <<include>>
```

#### Paquete: Colaboración y Diagramación
```mermaid
usecaseDiagram
    actor Usuario
    actor Colaborador
    
    usecase U17 as "Editar Simultáneamente (CU-17)"
    usecase U18 as "Ver Cursores y Avatares (CU-18)"
    usecase U05 as "Diseñar Diagrama UML (CU-05)"
    usecase U06 as "Exportar UML (CU-06)"
    
    Usuario --> U17
    Colaborador --> U17
    U17 ..> U18 : <<include>>
    
    Usuario --> U05
    U05 <.. U06 : <<extend>>
```

---

## FASE 2: Vista Lógica (Modelo Estático PUDS)

La Vista Lógica describe el modelo de objetos y la organización estructurada en paquetes del sistema SGDIA, apoyando la funcionalidad descrita en los Casos de Uso.

### 2.1. Diagrama de Paquetes (Arquitectura Capas N)

El backend de FastAPI sigue los principios de Clean Architecture y DDD (Domain-Driven Design).

```mermaid
classDiagram
    namespace Presentacion {
        class Routers_REST
        class WebSockets
    }
    
    namespace LogicaNegocio {
        class Services
        class Workers_Celery
        class ML_Engine
    }
    
    namespace Dominio {
        class Schemas_Pydantic
        class Interfaces
    }
    
    namespace Infraestructura {
        class Database_Beanie
        class RedisCache
        class S3_Storage
        class ExternalAPIs_LLM
    }

    Routers_REST --> Services : Inyecta
    WebSockets --> Services : Consume
    Services --> Workers_Celery : Delega Tareas Asíncronas
    Services --> Schemas_Pydantic : Valida
    Services --> Database_Beanie : CRUD
    Services --> RedisCache : Cache/Locking
    ML_Engine --> Database_Beanie : Lee métricas
```

### 2.2. Diagrama de Clases Central (Dominio Documental)

```mermaid
classDiagram
    class User {
        +ObjectId id
        +String username
        +String email
        +String hashed_password
        +List~Role~ roles
        +authenticate()
    }

    class Document {
        +ObjectId id
        +String title
        +String s3_path
        +Date created_at
        +List~float~ vector_embedding
        +generate_preview()
        +extract_text()
    }

    class DocumentVersion {
        +ObjectId id
        +ObjectId document_id
        +int version_number
        +String diff_patch
        +restore()
    }

    class Folder {
        +ObjectId id
        +String name
        +ObjectId parent_id
        +List~Document~ children
    }
    
    class Permission {
        +ObjectId id
        +String entity_type
        +String access_level
    }

    Folder "1" *-- "many" Folder : contains
    Folder "1" *-- "many" Document : contains
    Document "1" *-- "many" DocumentVersion : history
    User "many" -- "many" Document : accesses via Permission
```

### 2.3. Diagrama de Clases (Machine Learning & IA)

```mermaid
classDiagram
    class RAGEngine {
        +vector_search(query)
        +generate_context()
    }
    
    class LLMClient {
        +send_prompt(context, query)
        +stream_response()
    }
    
    class PredictionEngine {
        +detect_bottleneck(workflow_id)
        +optimize_resources()
    }

    RAGEngine --> Document : reads embeddings
    RAGEngine --> LLMClient : provides context
```

---

## FASE 3: Vista de Procesos (Comportamiento Dinámico PUDS)

La Vista de Procesos se centra en el comportamiento en tiempo de ejecución, detallando cómo se comunican los objetos, la concurrencia y la sincronización (asincronismo).

### 3.1. Diagrama de Secuencia: Flujo RAG (Chat con Documento)

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

### 3.2. Diagrama de Actividad: Procesamiento Asíncrono de un Documento (Celery)

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

---

## FASE 4: Vista de Implementación (Componentes PUDS)

La Vista de Implementación describe cómo los elementos lógicos se empaquetan en componentes de software (módulos, librerías, contenedores).

### 4.1. Diagrama de Componentes de Software

Muestra las dependencias entre los componentes físicos del código fuente.

```mermaid
componentDiagram
    package "Aplicaciones Cliente" {
        [Angular Web App] as Web
        [Flutter Mobile App] as Mobile
    }

    package "API Gateway / Proxy" {
        [Nginx / Traefik] as Proxy
    }

    package "Backend Microservices" {
        [FastAPI Core] as CoreAPI
        [Celery Workers] as Workers
    }

    package "Servicios Externos Integrados" {
        [ONLYOFFICE Document Server] as OnlyOffice
        [OpenAI / Anthropic API] as LLM
    }

    package "Infraestructura de Datos" {
        database "MongoDB Atlas" as DB
        database "Redis Cache" as Cache
        database "MinIO / S3 Storage" as S3
    }

    Web ..> Proxy : HTTP/WSS
    Mobile ..> Proxy : HTTP/WSS
    
    Proxy ..> CoreAPI : Rutas /api/v1
    Proxy ..> OnlyOffice : Rutas /collaborate
    
    CoreAPI ..> Workers : Tareas en Broker
    Workers ..> CoreAPI : Webhook Callback
    
    CoreAPI ..> DB : Motor/Beanie
    CoreAPI ..> Cache : Aioredlock
    CoreAPI ..> S3 : Boto3
    
    Workers ..> DB : Escritura pesada
    Workers ..> LLM : Async HTTP Client
    
    Web ..> OnlyOffice : iFrame integration
```

### 4.2. Gestión de Dependencias (Gestores de Paquetes)
*   **Backend:** Gestionado mediante `requirements.txt`, empaquetando dependencias como `fastapi`, `beanie`, `motor`, `celery`, y `openai`.
*   **Frontend:** Gestionado mediante `package.json`, empaquetando `@angular/core`, `chart.js`, `socket.io-client`, entre otros.
*   **Móvil:** Gestionado mediante `pubspec.yaml`, empaquetando `flutter_riverpod`, `dio`, `go_router`, y `local_auth`.

---

## FASE 5: Vista de Despliegue (Física PUDS)

La Vista de Despliegue muestra la topología del hardware y el software en el que se ejecuta el sistema. Mapea los componentes de software (Vista de Implementación) a nodos de hardware físico o virtual (Contenedores/Nube).

### 5.1. Diagrama de Despliegue en AWS (Producción)

El sistema SGDIA está diseñado para desplegarse en Amazon Web Services utilizando contenedores ECS/Fargate para alta disponibilidad.

```mermaid
architecture-beta
    group vpc(cloud)[VPC AWS - Región us-east-1]
    
    group pub_subnet(subnet)[Subred Pública] in vpc
    service alb(server)[Application Load Balancer] in pub_subnet
    
    group priv_subnet(subnet)[Subred Privada] in vpc
    service api(server)[ECS: Contenedores FastAPI] in priv_subnet
    service worker(server)[ECS: Celery Workers] in priv_subnet
    service broker(server)[ElastiCache Redis] in priv_subnet
    
    group data_tier(database)[Capa de Datos Persistente]
    service mongo(database)[MongoDB Atlas Cluster] 
    service s3(server)[AWS S3 Buckets]
    
    service user_web(internet)[Navegador Web (Angular)]
    service user_mov(internet)[App Móvil (Flutter)]
    service onlyoffice(server)[Instancia EC2 ONLYOFFICE] in priv_subnet

    user_web:R --> L:alb
    user_mov:R --> L:alb
    
    alb:B --> T:api
    alb:R --> L:onlyoffice
    
    api:R --> L:broker
    api:B --> T:worker
    
    api:R --> L:mongo
    worker:R --> L:mongo
    
    api:R --> L:s3
    worker:R --> L:s3
```

### 5.2. Descripción de los Nodos

*   **Nodo Cliente:** Dispositivos (Laptops, Smartphones) ejecutando el motor V8 de Chrome o el binario compilado de Flutter.
*   **ALB (Load Balancer):** Balanceador de carga L7 que distribuye el tráfico HTTPS y gestiona la terminación SSL. Mantiene persistencia de sesión para los WebSockets.
*   **Contenedores ECS (FastAPI):** Nodos sin estado (stateless) auto-escalables que procesan peticiones REST y mantienen conexiones WS.
*   **Contenedores ECS (Workers Celery):** Nodos dedicados al cómputo asíncrono.
*   **ElastiCache (Redis):** Actúa como Broker de mensajes (pub/sub) para Celery y como caché de alta velocidad.
*   **MongoDB Atlas:** Cluster distribuido en la nube, gestionado (DBaaS).
*   **Amazon S3:** Almacenamiento de objetos que provee durabilidad 99.999999999%.

---
*Fin del Documento.*
