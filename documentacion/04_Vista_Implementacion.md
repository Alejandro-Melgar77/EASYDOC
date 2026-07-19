# Vista de Implementación (Componentes PUDS)

La Vista de Implementación describe cómo los elementos lógicos se empaquetan en componentes de software (módulos, librerías, contenedores).

## 1. Diagrama de Componentes de Software

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

## 2. Gestión de Dependencias (Gestores de Paquetes)
*   **Backend:** Gestionado mediante `requirements.txt` (o `Poetry`), empaquetando dependencias como `fastapi`, `beanie`, `motor`, `celery`, y `openai`.
*   **Frontend:** Gestionado mediante `package.json` (NPM/Yarn), empaquetando `@angular/core`, `chart.js`, `socket.io-client`, entre otros.
*   **Móvil:** Gestionado mediante `pubspec.yaml` (Dart Pub), empaquetando `flutter_riverpod`, `dio`, `go_router`, y `local_auth`.
