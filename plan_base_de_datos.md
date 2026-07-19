# 🗄️ AGENTE 1 — BASE DE DATOS

## Identidad y Rol

| Campo | Valor |
|---|---|
| **Nombre** | Agente Base de Datos |
| **Archivo de avance** | `avance_base_de_datos.md` |
| **Responsabilidad** | Diseño, creación y mantenimiento de todos los schemas MongoDB, índices, colecciones, configuración Redis, buckets S3, seeds y migraciones |
| **Tecnologías** | MongoDB Atlas, Redis, Amazon S3 |
| **Directorio de trabajo** | `sgdia/backend/app/models/` y `sgdia/database/` |

## Reglas de Comportamiento

1. **Antes de empezar**, leer `avance_base_de_datos.md` para saber en qué tarea quedó.
2. **Al completar cada tarea**, registrar en `avance_base_de_datos.md` con timestamp, descripción y estado.
3. **No modificar** archivos de `routers/`, `services/`, `frontend/` ni `mobile/`.
4. **Comunicar** al Agente Backend cuando un schema esté listo (creando el archivo en `models/`).
5. **Validar** cada schema con datos de prueba antes de marcarlo como completado.
6. **Nomenclatura**: archivos en snake_case, colecciones en plural (`users`, `documents`, `policies`).

## Métricas de Calidad

| Métrica | Objetivo |
|---|---|
| Queries de lectura | < 100ms con índices |
| Búsqueda semántica | < 2s con Atlas Vector Search |
| Búsqueda y filtrado de logs | < 2s |
| Schemas con validación | 100% de colecciones |
| Índices compuestos documentados | 100% |
| Seeds de datos de prueba | Mínimo 10 registros por colección |

## Dependencias con Otros Agentes

| Dependo de | Para |
|---|---|
| Nadie | Este agente inicia primero, sin dependencias |

| Dependen de mí | Para |
|---|---|
| **Backend** | Schemas listos para implementar servicios y routers |
| **Frontend** | Conocer la forma de los datos (interfaces TypeScript) |
| **Móvil** | Conocer la forma de los datos (modelos Dart) |

---

## FASE 0 — Infraestructura de Datos (Día 1-2)

### Tarea 0.1: Configurar MongoDB local/Atlas
- [x] Crear archivo `sgdia/database/docker-compose.db.yml` con MongoDB y Redis
- [x] Configurar réplica set para soporte de transacciones
- [x] Crear base de datos `sgdia_dev` y usuario de desarrollo
- [x] Documentar connection string en `.env.example`

### Tarea 0.2: Configurar Redis
- [x] Instancia Redis en Docker para cache y pub/sub
- [x] Definir namespaces: `sgdia:jwt_blacklist:`, `sgdia:lockout:`, `sgdia:cache:`, `notifications:`
- [x] Documentar TTLs por namespace

### Tarea 0.3: Configurar S3 (o MinIO local)
- [x] Crear buckets: `sgdia-documents`, `sgdia-exports`, `sgdia-avatars`, `sgdia-temp`
- [ ] Configurar política de versionado en `sgdia-documents` (pendiente de validar contra MinIO)
- [x] Configurar lifecycle rules para temporales y documentar la equivalencia local
- [x] Documentar estructura de keys: `{org_id}/{module}/{year}/{month}/{file_id}`

### Tarea 0.4: Crear modelo base Beanie
- [x] Crear `sgdia/backend/app/models/base.py` con clase base que incluya:
  - `id`, `created_at`, `updated_at`, `created_by`, `is_deleted` (soft delete)

---

## FASE 1 — Schemas de Usuarios y Roles (Día 2-3)

### Tarea 1.1: Schema `users`
- [x] Archivo: `backend/app/models/user.py`
- [x] Campos: `email` (unique), `name`, `password_hash`, `role_id` (ref), `status` (active/inactive/blocked), `failed_login_attempts`, `last_login`, `avatar_url`, `preferences`
- [x] Índices: unique en `email`, índice en `status`, compuesto `{role_id, status}`
- [x] Validaciones: email format, name min 2 chars

### Tarea 1.2: Schema `roles`
- [x] Archivo: `backend/app/models/role.py`
- [x] Campos: `name` (unique), `description`, `permissions[]` ({module, actions[]})
- [x] Acciones posibles: `read`, `write`, `delete`, `approve`, `admin`
- [x] Seed roles: Administrador, Analista, Gestor, Colaborador, Usuario Final

### Tarea 1.3: Schema `audit_logs`
- [x] Archivo: `backend/app/models/audit_log.py`
- [x] Campos: `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `ip_address`, `result`, `details`, `module`
- [x] Colección append-only (sin updates ni deletes)
- [x] TTL index para retención de 2 años

### Tarea 1.4: Seeds de datos iniciales
- [x] Script `sgdia/database/seeds/seed_users.py`
- [x] Admin por defecto, 5 usuarios prueba, 5 roles predefinidos

---

## FASE 2 — Schemas de Repositorio Documental (Día 3-4)

### Tarea 2.1: Schema `documents`
- [x] Archivo: `backend/app/models/document.py`
- [x] Campos: `title`, `description`, `file_type`, `s3_key`, `s3_bucket`, `folder_id`, `tags[]`, `metadata`, `size_bytes`, `mime_type`, `extracted_text`, `embedding_vector`, `current_version`, `permissions[]`, `status`
- [x] Text index en `{title, description, extracted_text}`
- [x] Definicion del Atlas Vector Search index en `database/scripts/create_vector_indexes.py` (dim 1536)

### Tarea 2.2: Schema `document_versions`
- [x] Archivo: `backend/app/models/document_version.py`
- [x] Campos: `document_id`, `version_number`, `s3_key`, `size_bytes`, `change_summary`, `created_by`
- [x] Índice unique: `{document_id, version_number}`

### Tarea 2.3: Schema `folders`
- [x] Archivo: `backend/app/models/folder.py`
- [x] Campos: `name`, `parent_id` (self-ref), `path` (materializado), `permissions[]`, `owner_id`
- [x] Índice unique: `{parent_id, name}`

---

## FASE 3 — Schemas de Edición Colaborativa (Día 4-5)

### Tarea 3.1: Schema `collaboration_sessions`
- [ ] Archivo: `backend/app/models/collaboration_session.py`
- [ ] Campos: `document_id`, `active_users[]`, `status`, `started_at`, `closed_at`, `onlyoffice_key`

### Tarea 3.2: Schema `comments`
- [ ] Archivo: `backend/app/models/comment.py`
- [ ] Campos: `document_id`, `user_id`, `content`, `selection_range`, `resolved`, `parent_comment_id`

---

## FASE 4 — Schemas del Diagramador UML y Workflow (Día 5-7)

### Tarea 4.1: Schema `policies`
- [x] Archivo: `backend/app/models/policy.py`
- [x] Campos: `name`, `description`, `diagram_data` (JSON), `status` (draft/review/published), `current_version`, `approver_id`, `published_at`, `embedding_vector`, `tags[]`
- [x] Atlas Vector Search en `embedding_vector`

### Tarea 4.2: Schema `policy_versions`
- [x] Archivo: `backend/app/models/policy_version.py`
- [x] Unique index: `{policy_id, version_number}`

### Tarea 4.3: Schema `workflow_instances`
- [x] Archivo: `backend/app/models/workflow.py`
- [x] Campos: `policy_id`, `current_node_id`, `status`, `history[]`, `variables`, `started_by`

### Tarea 4.4: Schema `workflow_tasks`
- [x] Archivo: `backend/app/models/workflow_task.py`
- [x] Campos: `workflow_id`, `node_id`, `assigned_to`, `status`, `due_date`, `completed_at`

---

## FASE 5 — Schemas del Agente IA (Día 7-9)

### Tarea 5.1: Schema `conversations`
- [ ] Archivo: `backend/app/models/conversation.py`
- [ ] Campos: `user_id`, `title`, `messages[]`, `status`, `escalated`, `escalated_to`

### Tarea 5.2: Schema `agent_feedback`
- [ ] Archivo: `backend/app/models/agent_feedback.py`
- [ ] Campos: `conversation_id`, `message_index`, `rating` (1-5), `comment`, `user_id`

### Tarea 5.3: Configurar Atlas Vector Search
- [ ] Search index en `policies.embedding_vector` y `documents.embedding_vector`
- [ ] Script: `sgdia/database/scripts/create_vector_indexes.py`

---

## FASE 6 — Schemas del Motor DL (Día 9-11)

### Tarea 6.1: Schema `predictions`
- [ ] Archivo: `backend/app/models/prediction.py`
- [ ] Campos: `type` (route/bottleneck/anomaly/resource), `entity_id`, `score`, `details`, `model_version`

### Tarea 6.2: Schema `ml_models`
- [ ] Archivo: `backend/app/models/ml_model.py`
- [ ] Campos: `name`, `type`, `version`, `s3_path`, `metrics`, `status`, `trained_at`

### Tarea 6.3: Schema `training_data`
- [ ] Archivo: `backend/app/models/training_data.py`

---

## FASE 7 — Schemas de Reportes (Día 11-12)

### Tarea 7.1: Schema `reports`
- [ ] Archivo: `backend/app/models/report.py`
- [ ] Campos: `title`, `type`, `parameters`, `format`, `status`, `s3_key`, `requested_by`, `schedule`, `template_id`

### Tarea 7.2: Schema `report_templates`
- [ ] Archivo: `backend/app/models/report_template.py`

---

## FASE 8 — Schemas de Notificaciones (Día 12-13)

### Tarea 8.1: Schema `notifications`
- [ ] Archivo: `backend/app/models/notification.py`
- [ ] Campos: `user_id`, `type`, `title`, `message`, `link`, `read`, `channel`, `sent_at`

### Tarea 8.2: Schema `system_settings`
- [ ] Archivo: `backend/app/models/system_settings.py`
- [ ] Seeds: umbrales IA, tiempos retención, config notificaciones

---

## FASE 9-10 — Optimización y Validación (Día 13-15)

### Tarea 9.1: Índices de paginación cursor-based
- [ ] En: `documents`, `notifications`, `conversations`, `audit_logs`

### Tarea 10.1: Auditoría de índices
- [ ] `db.collection.getIndexes()` en todas las colecciones
- [ ] Sin duplicados ni innecesarios

### Tarea 10.2: Scripts de migración
- [ ] Directorio `sgdia/database/migrations/` con scripts numerados y rollback

### Tarea 10.3: Validación de rendimiento
- [ ] Benchmark con `explain()`: texto < 100ms, vector < 2s, audit < 2s
