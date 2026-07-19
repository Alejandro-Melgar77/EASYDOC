# ⚙️ AGENTE 2 — BACKEND

## Identidad y Rol

| Campo | Valor |
|---|---|
| **Nombre** | Agente Backend |
| **Archivo de avance** | `avance_backend.md` |
| **Responsabilidad** | Implementar API REST/WebSocket con FastAPI, lógica de negocio, integración IA/DL, Celery workers, seguridad JWT/RBAC |
| **Tecnologías** | Python, FastAPI, Celery, TensorFlow, PyTorch, Claude/OpenAI API |
| **Directorio de trabajo** | `sgdia/backend/` (excepto `models/` que es del Agente BD) |

## Reglas de Comportamiento

1. **Antes de empezar**, leer `avance_backend.md` para retomar donde quedó.
2. **Al completar cada tarea**, registrar en `avance_backend.md` con timestamp y estado.
3. **Importar** los schemas de `models/` sin modificarlos (responsabilidad del Agente BD).
4. **No modificar** archivos en `frontend/`, `mobile/`, ni `database/`.
5. **Cada endpoint** debe tener: validación Pydantic, manejo de errores, log de auditoría, test unitario.
6. **Documentar** cada endpoint con docstrings OpenAPI (auto-generado por FastAPI).

## Métricas de Calidad

| Métrica | Objetivo |
|---|---|
| Tiempo de respuesta API | < 500ms para auth, < 1s general, < 2s para DL |
| Cobertura de tests | > 80% en servicios críticos |
| Endpoints documentados | 100% con OpenAPI |
| JWT expiración | 8h access, 24h refresh |
| Intentos login máximos | 5 antes de bloqueo |
| Contaseñas | bcrypt hash |

## Dependencias con Otros Agentes

| Dependo de | Para |
|---|---|
| **Base de Datos** | Schemas en `models/` listos antes de implementar servicios |

| Dependen de mí | Para |
|---|---|
| **Frontend** | Endpoints REST disponibles + documentación OpenAPI |
| **Móvil** | Mismos endpoints REST |

---

## FASE 0 — Estructura del Proyecto FastAPI (Día 1-2)

### Tarea 0.1: Inicializar proyecto FastAPI
- [ ] Crear `backend/app/main.py` con FastAPI app, CORS, lifespan events
- [ ] Crear `backend/requirements.txt` (fastapi, uvicorn, motor, beanie, pydantic, bcrypt, PyJWT, boto3, celery, redis, python-multipart, etc.)
- [ ] Crear `backend/Dockerfile`
- [ ] Crear `backend/.env.example`

### Tarea 0.2: Core — Config y Database
- [ ] `backend/app/core/config.py` — Settings con Pydantic BaseSettings
- [ ] `backend/app/core/database.py` — Conexión MongoDB Motor + init Beanie
- [ ] `backend/app/core/redis.py` — Pool de conexiones Redis

### Tarea 0.3: Core — Seguridad
- [ ] `backend/app/core/security.py` — hash_password(), verify_password(), create_jwt(), decode_jwt()
- [ ] `backend/app/core/dependencies.py` — get_current_user(), require_permissions()

### Tarea 0.4: Docker Compose maestro
- [ ] `sgdia/docker-compose.yml` con: backend, MongoDB, Redis, Celery worker, ONLYOFFICE

---

## FASE 1 — Auth y Usuarios: CU-01 a CU-04 (Día 2-4)

### Tarea 1.1: Router de Autenticación
- [ ] `backend/app/routers/auth.py`
  - `POST /api/auth/register` — CU-01: Solo admin crea usuarios, envía email bienvenida
  - `POST /api/auth/login` — CU-02: Valida credenciales, genera JWT, registra log
  - `POST /api/auth/logout` — CU-04: Blacklist JWT en Redis
  - `POST /api/auth/refresh` — Renueva access token con refresh token

### Tarea 1.2: Servicio de Autenticación
- [ ] `backend/app/services/auth_service.py`
  - Lógica de bloqueo tras 5 intentos fallidos
  - Generación de tokens con roles/permisos embebidos
  - Validación de refresh tokens

### Tarea 1.3: Router de Usuarios
- [ ] `backend/app/routers/users.py`
  - `GET /api/users` — Listar con paginación y filtros
  - `GET /api/users/{id}` — Detalle de usuario
  - `PUT /api/users/{id}` — Editar usuario
  - `DELETE /api/users/{id}` — Desactivar (soft delete)

### Tarea 1.4: Router de Roles — CU-03
- [ ] `backend/app/routers/roles.py`
  - CRUD completo de roles con permisos por módulo
  - Invalidar cache Redis al modificar permisos
  - Bloquear eliminación del rol Administrador

### Tarea 1.5: Servicio de Auditoría (transversal)
- [ ] `backend/app/services/audit_service.py`
  - `log_action(user_id, action, entity, result, details)` — Inserta en colección audit_logs
  - Middleware que captura IP del request

### Tarea 1.6: Tests unitarios Fase 1
- [ ] `backend/tests/test_auth.py` — Login ok, login fail, bloqueo, refresh, logout
- [ ] `backend/tests/test_users.py` — CRUD usuarios
- [ ] `backend/tests/test_roles.py` — CRUD roles, protección admin

---

## FASE 2 — Repositorio Documental: CU-11 a CU-16 (Día 4-6)

### Tarea 2.1: Servicio de Storage S3
- [ ] `backend/app/services/storage_service.py`
  - `upload_file()` — Multipart upload a S3
  - `get_presigned_url()` — URLs prefirmadas para descarga/preview
  - `delete_file()` — Borrado con versionado

### Tarea 2.2: Servicio de Extracción de Texto
- [ ] `backend/app/services/text_extraction.py`
  - Extraer texto de PDF (PyPDF2), DOCX (python-docx), XLSX (openpyxl), imágenes (Tesseract OCR)
  - Generar embedding vector para búsqueda semántica

### Tarea 2.3: Router de Documentos
- [ ] `backend/app/routers/documents.py`
  - `POST /api/documents/upload` — CU-11: Carga + metadatos + extracción texto + embedding
  - `GET /api/documents/search` — CU-12: Búsqueda texto/filtros/semántica
  - `GET /api/documents/{id}/versions` — CU-13: Historial versiones
  - `PUT /api/documents/{id}/permissions` — CU-14: Gestión permisos
  - `GET /api/documents/{id}/preview` — CU-15: URL prefirmada para preview
  - `DELETE /api/documents/{id}` — CU-16: Borrado lógico/físico
  - CRUD de carpetas

### Tarea 2.4: Tests Fase 2
- [ ] Tests para upload, búsqueda, versiones, permisos, preview, delete

---

## FASE 3 — Edición Colaborativa: CU-17 a CU-20 (Día 6-8)

### Tarea 3.1: Servicio de Colaboración
- [ ] `backend/app/services/collaboration_service.py`
  - Integración con ONLYOFFICE Document Server API
  - Crear/cerrar sesiones, callback de guardado

### Tarea 3.2: Router de Colaboración
- [ ] `backend/app/routers/collaboration.py`
  - `POST /api/collaboration/sessions` — CU-17: Abrir sesión
  - `GET /api/collaboration/sessions/{id}/config` — Config ONLYOFFICE
  - `POST /api/collaboration/callback` — Webhook guardado ONLYOFFICE
  - `POST /api/collaboration/{doc_id}/comments` — CU-19: CRUD comentarios
  - `POST /api/collaboration/sessions/{id}/close` — CU-20: Cerrar sesión

### Tarea 3.3: WebSocket de Colaboración
- [ ] `backend/app/routers/ws_collaboration.py`
  - CU-18: WebSocket para sincronización de cursores/presencia
  - Broadcast de eventos de edición

### Tarea 3.4: Tests Fase 3
- [ ] Tests para sesiones, comentarios, cierre

---

## FASE 4 — Diagramador UML y Workflow: CU-05 a CU-10 (Día 8-11)

### Tarea 4.1: Router de Políticas
- [ ] `backend/app/routers/policies.py`
  - `POST /api/policies` — CU-05: Crear diagrama
  - `GET /api/policies/{id}` — Obtener diagrama
  - `PUT /api/policies/{id}` — Actualizar diagrama
  - `POST /api/policies/{id}/submit-review` — CU-07: Enviar a revisión
  - `POST /api/policies/{id}/approve` — CU-07: Aprobar y publicar
  - `GET /api/policies/{id}/versions` — CU-09: Versiones
  - `GET /api/policies/{id}/export` — CU-10: Exportar SVG/PNG/XMI

### Tarea 4.2: WebSocket de Colaboración UML
- [ ] `backend/app/routers/ws_policies.py`
  - CU-06: WebSocket por sala de diagrama
  - OT/CRDT para resolución de conflictos
  - Broadcast de cambios < 100ms

### Tarea 4.3: Motor de Workflow — CU-08
- [ ] `backend/app/services/workflow_engine.py`
  - Parser: diagram_data JSON → grafo de nodos ejecutables
  - Interprete: recorrer nodos, evaluar condiciones, asignar tareas
  - `POST /api/workflows/start` — Iniciar instancia
  - `POST /api/workflows/{id}/advance` — Avanzar al siguiente nodo
  - `GET /api/workflows/{id}/status` — Estado actual

### Tarea 4.4: Servicio de Exportación
- [ ] `backend/app/services/export_service.py` — Renderizar diagrama a SVG/PNG

### Tarea 4.5: Tests Fase 4
- [ ] Tests para CRUD políticas, workflow engine, exportación

---

## FASE 5 — Agente IA: CU-21 a CU-26 (Día 11-14)

### Tarea 5.1: Cliente LLM
- [ ] `backend/app/services/llm_client.py`
  - Cliente configurable Claude/OpenAI con fallback
  - Rate limiting, retry con backoff, token counting

### Tarea 5.2: Motor RAG
- [ ] `backend/app/services/rag_engine.py`
  - Generar embeddings de políticas publicadas
  - Búsqueda vectorial en MongoDB Atlas Vector Search
  - Prompt engineering: system prompt + contexto + pregunta

### Tarea 5.3: Servicios ASR y OCR
- [ ] `backend/app/services/asr_service.py` — CU-22: Audio → texto (Whisper)
- [ ] `backend/app/services/ocr_service.py` — CU-23: Doc adjunto → texto

### Tarea 5.4: Router del Agente
- [ ] `backend/app/routers/agent.py`
  - `POST /api/agent/chat` — CU-21: Consulta texto con RAG
  - `POST /api/agent/audio` — CU-22: Consulta audio
  - `POST /api/agent/document` — CU-23: Consulta con doc
  - `GET /api/agent/conversations` — CU-24: Historial
  - `POST /api/agent/feedback` — CU-25: Retroalimentación
  - `POST /api/agent/escalate/{conv_id}` — CU-26: Escalar a humano

### Tarea 5.5: WebSocket del Chat
- [ ] `backend/app/routers/ws_agent.py` — Streaming de respuestas en tiempo real

### Tarea 5.6: Tests Fase 5
- [ ] Tests para RAG, chat, audio, escalamiento

---

## FASE 6 — Motor DL: CU-27 a CU-31 (Día 14-17)

### Tarea 6.1: Modelos de ML
- [ ] `backend/app/ml/route_predictor.py` — CU-27: Predicción ruta óptima
- [ ] `backend/app/ml/bottleneck_detector.py` — CU-28: Detección cuellos de botella
- [ ] `backend/app/ml/anomaly_detector.py` — CU-29: Anomalías (autoencoders)
- [ ] `backend/app/ml/resource_optimizer.py` — CU-30: Priorización recursos

### Tarea 6.2: Router de Predicciones
- [ ] `backend/app/routers/predictions.py`
  - `GET /api/predictions/routes/{doc_id}` — CU-27
  - `GET /api/predictions/bottlenecks` — CU-28
  - `GET /api/predictions/anomalies` — CU-29
  - `POST /api/predictions/resources` — CU-30
  - `GET /api/predictions/dashboard` — CU-31

### Tarea 6.3: Workers Celery para ML
- [ ] `backend/app/workers/ml_tasks.py` — Tareas async de entrenamiento/inferencia

### Tarea 6.4: Tests Fase 6

---

## FASE 7 — Reportes: CU-32 a CU-36 (Día 17-19)

### Tarea 7.1: Servicio de Reportes
- [ ] `backend/app/services/report_generator.py` — Generación PDF/Excel/CSV
- [ ] `backend/app/workers/report_tasks.py` — Celery tasks + scheduler

### Tarea 7.2: Router de Reportes
- [ ] `backend/app/routers/reports.py`
  - `POST /api/reports` — CU-32: Por formulario
  - `POST /api/reports/voice` — CU-33: Por voz (ASR → params)
  - `POST /api/reports/schedule` — CU-34: Programar recurrente
  - `GET /api/reports/{id}/view` — CU-35: Datos para gráficas
  - CRUD `/api/reports/templates` — CU-36: Plantillas

### Tarea 7.3: Tests Fase 7

---

## FASE 8 — Notificaciones y Auditoría: CU-37 a CU-40 (Día 19-21)

### Tarea 8.1: Servicio de Notificaciones
- [ ] `backend/app/services/notification_service.py`
  - Envío in-app (WebSocket), email (SMTP/SES), push (Firebase)

### Tarea 8.2: Router de Notificaciones y Auditoría
- [ ] `backend/app/routers/notifications.py`
  - `WS /api/notifications/ws` — CU-37: Push en tiempo real
  - `GET /api/notifications` — Historial
- [ ] `backend/app/routers/audit.py`
  - `GET /api/audit/logs` — CU-38: Logs con filtros
  - `GET /api/audit/trace/{entity_id}` — CU-39: Trazabilidad
  - `GET /api/audit/export` — CSV/JSON

### Tarea 8.3: Router de Configuración — CU-40
- [ ] `backend/app/routers/settings.py`
  - `GET/PUT /api/settings` — Hot-reload sin reinicio

### Tarea 8.4: Tests Fase 8

---

## FASE 10 — Testing Final (Día 23-25)

### Tarea 10.1: Tests de integración completos
- [ ] Flujos E2E: registro → login → upload doc → búsqueda → chat IA
- [ ] Load testing: verificar < 2s en 95% de operaciones

### Tarea 10.2: Seguridad
- [ ] OWASP Top 10 checklist
- [ ] Validación de inputs en todos los endpoints
- [ ] CSRF, rate limiting, TLS config
