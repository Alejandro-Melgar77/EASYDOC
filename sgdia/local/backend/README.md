# EASYDOC Backend - Gestion documental academica con IA local

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework API | FastAPI 0.104+ |
| Base de Datos | MongoDB 7 (Motor + Beanie ODM) |
| Cache / Broker | Redis 7 |
| Cola de Tareas | Celery 5 + Beat |
| Storage | S3 / MinIO |
| Autenticación | JWT (PyJWT) + RBAC |
| IA / ML | Motor local/offline, dataset sintetico EASYDOC y artefactos JSON entrenables |
| Documentos | PDF, DOCX, XLSX, OCR (Tesseract) |
| Reportes | fpdf2, openpyxl, CSV |
| Contenedores | Docker + Docker Compose |

---

## Inicio Rapido (Desarrollo)

### 1. Clonar y preparar entorno
```bash
cd sgdia/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

### 2. Copiar variables de entorno
```bash
copy .env.example .env
# Editar .env con tus credenciales reales
```

### 3. Levantar infraestructura con Docker
```bash
cd ..   # raíz del proyecto (sgdia/)
docker-compose up -d mongodb redis minio
```

### 4. Poblar la base de datos
```bash
python scripts/seed_db.py
# Usuario demo: directora@easydoc.edu / password123
```

### 5. Iniciar el servidor
```bash
uvicorn app.main:app --reload --port 8000
```

### 6. Abrir documentación interactiva
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- Health: http://localhost:8000/api/health

---

## Datos demo e IA local

EASYDOC incluye un generador reproducible de datos universitarios entre marzo y julio 2026.
El entrenamiento actual es un baseline estadistico offline que produce un artefacto JSON para
prediccion de rutas, riesgos de cuello de botella y carga por trabajador.

```bash
python scripts/generate_easydoc_demo_data.py
```

Salidas principales:

- `app/ml/training_data/easydoc_university_march_july.json`
- `app/ml/artifacts/easydoc_route_model.json`
- `../database/seeds/easydoc_demo_seed.json`

## Tests

```bash
# Instalar dependencias de test
pip install pytest pytest-asyncio httpx

# Correr todos los tests
pytest

# Con cobertura
pytest --cov=app --cov-report=html
```

---

## 🏗️ Estructura del Proyecto

```
backend/
├── app/
│   ├── core/           # Config, DB, Redis, Seguridad, Dependencias
│   ├── models/         # Documentos Beanie (esquemas MongoDB)
│   ├── schemas/        # Modelos Pydantic para request/response
│   ├── routers/        # Endpoints FastAPI (REST + WebSocket)
│   ├── services/       # Lógica de negocio
│   ├── ml/             # Modelos de ML (predicciones, anomalías)
│   ├── workers/        # Tareas Celery (ML, reportes, notificaciones)
│   └── middleware/     # Middleware de auditoría
├── tests/              # Tests con pytest + httpx
├── scripts/            # Seeds, migraciones, utilidades
├── Dockerfile
├── requirements.txt
├── pytest.ini
└── .env.example
```

---

## 📡 Endpoints Principales

| Módulo | Base URL | WebSocket |
|---|---|---|
| Autenticación | `/api/auth` | — |
| Usuarios | `/api/users` | — |
| Roles | `/api/roles` | — |
| Documentos | `/api/documents` | — |
| Colaboración | `/api/collaboration` | `/ws/collab/{doc_id}` |
| Políticas/UML | `/api/policies` | `/ws/policies/{id}` |
| Agente IA | `/api/agent` | `/ws/agent/chat` |
| Predicciones ML | `/api/predictions` | — |
| Reportes | `/api/reports` | — |
| Notificaciones | `/api/notifications` | `/ws/notifications/{user_id}` |
| Auditoría | `/api/audit` | — |
| Configuración | `/api/settings` | — |

---

## 🔐 Autenticación

Todos los endpoints protegidos requieren:
```
Authorization: Bearer <access_token>
```

### Flujo de login
```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sgdia.local", "password": "Admin@SGDIA2026!"}'

# Respuesta: { "access_token": "...", "refresh_token": "..." }

# 2. Usar el token
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <access_token>"
```

---

## 🔧 Workers Celery

```bash
# Worker general
celery -A app.workers.celery_app worker --loglevel=info

# Beat scheduler (tareas programadas)
celery -A app.workers.celery_app beat --loglevel=info

# Flower (monitoreo UI)
celery -A app.workers.celery_app flower --port=5555
```

---

## 📊 Colecciones MongoDB

| Colección | Descripción |
|---|---|
| `users` | Usuarios del sistema |
| `roles` | Roles y permisos |
| `documents` | Documentos con embedding vectorial |
| `document_versions` | Historial de versiones |
| `folders` | Estructura de carpetas |
| `comments` | Comentarios colaborativos |
| `policies` | Políticas/diagramas UML |
| `collaboration_sessions` | Sesiones de edición en tiempo real |
| `workflow_instances` | Instancias de workflow activas |
| `audit_logs` | Logs de auditoría |
| `notifications` | Notificaciones de usuario |
| `system_settings` | Configuración del sistema |
| `reports` | Metadatos de reportes generados |
| `report_schedules` | Reportes programados |
| `report_templates` | Plantillas de reportes |
| `agent_history` | Historial de conversaciones con IA |
