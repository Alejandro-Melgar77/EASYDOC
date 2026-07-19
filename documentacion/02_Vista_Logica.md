# Vista Lógica (Modelo Estático PUDS)

La Vista Lógica describe el modelo de objetos y la organización estructurada en paquetes del sistema SGDIA, apoyando la funcionalidad descrita en los Casos de Uso.

## 1. Diagrama de Paquetes (Arquitectura Capas N)

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

## 2. Diagrama de Clases Central (Dominio Documental)

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

## 3. Diagrama de Clases (Machine Learning & IA)

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
