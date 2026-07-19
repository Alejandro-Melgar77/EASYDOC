# Avance - Agente de Base de Datos EASYDOC

## Estado general

| Metrica | Valor |
|---|---|
| Fase actual | Fase 3 - Schemas de edicion colaborativa |
| Tareas completadas | 11 / 35 |
| Ultima actualizacion | 2026-07-17 |
| Bloqueantes | Ninguno |

## Registro de avance

### 2026-07-17 - Fase 0: Infraestructura de datos

- Estado: completada, con una validacion pendiente de versionado MinIO.
- Tareas completadas: 0.1 MongoDB local/replica set, 0.2 Redis, 0.3 MinIO local y 0.4 modelo base Beanie.
- Archivos principales: `database/docker-compose.db.yml`, `database/.env.example`,
  `database/init-mongo.js`, `database/README.md`, `backend/app/models/base.py`,
  `backend/app/core/config.py` y `docker-compose.yml`.
- Correcciones aplicadas:
  - Redis del compose principal publica `6380` por defecto y permite usar otro puerto con `REDIS_HOST_PORT`.
  - El backend y Celery usan `mongodb`, `redis`, `minio` y `onlyoffice` cuando se ejecutan dentro de Docker.
  - El compose alternativo de replica set usa `27020-27022`, `6381` y `9010-9011`.
  - Se elimino la dependencia de un `mongo-keyfile` que no existia en el repositorio.
  - MinIO quedo parametrizado mediante `S3_ENDPOINT`, `S3_ACCESS_KEY` y `S3_SECRET_KEY`.
- Validacion: Compose renderizado correctamente; pruebas Python y lint pendientes de ejecutar en esta fase.
- Siguiente tarea: Fase 1, schemas `users`, `roles` y `audit_logs`, y seeds iniciales.

### 2026-07-17 - Fase 1: Usuarios, roles y auditoria

- Estado: completada.
- Tareas completadas: 1.1 `users`, 1.2 `roles`, 1.3 `audit_logs` y 1.4 seed inicial.
- Correcciones aplicadas: se consolido `ActivityLog` como alias compatible de `AuditLog`
  para evitar dos modelos Beanie sobre la misma coleccion; el modelo registrado ahora conserva
  el TTL de dos anos.
- Validacion: 43 pruebas del backend pasan, Ruff pasa y el seed creo 5 roles y 6 usuarios
  en MongoDB local sin errores de consola.
- Siguiente tarea: Fase 2, schemas `documents`, `document_versions` y `folders`.

### 2026-07-17 - Fase 2: Repositorio documental

- Estado: completada para desarrollo local; la ejecucion del indice vectorial queda
  condicionada a disponer de MongoDB Atlas.
- Tareas completadas: 2.1 `documents`, 2.2 `document_versions` y 2.3 `folders`.
- Validaciones agregadas: dimensiones de embedding exactamente 1536, nombres de carpeta
  sin separadores de ruta, indice de texto en documentos e indice unico por version.
- Herramienta agregada: `database/scripts/create_vector_indexes.py`; por defecto muestra
  la definicion y con `--apply` la envia a Atlas.
- Validacion: 45 pruebas del backend pasan, Ruff pasa y la vista previa JSON de indices fue generada.
- Siguiente tarea: Fase 3, schemas de sesiones colaborativas y comentarios.

## Convenciones Redis

- `sgdia:jwt_blacklist:<token>`: hasta la expiracion del JWT.
- `sgdia:lockout:<email>` y `sgdia:login_attempts:<email>`: proteccion de acceso.
- `sgdia:cache:<recurso>:<id>`: TTL recomendado de 5 minutos.
- `sgdia:system_settings`: configuracion caliente.
- `notifications:<user_id>`: TTL recomendado de 30 dias.
# Actualizacion 2026-07-19 - Datos para politicas e IA local

- **Estado**: Semilla idempotente ejecutada en MongoDB local.
- **Contenido**: 10 politicas academicas publicadas, 30 artefactos asociados, 1,409 solicitudes
  sinteticas entre marzo y julio de 2026, departamentos, responsables, tareas, eventos y entradas
  de repositorio por trabajador.
- **Trazabilidad**: `service_requests` conserva codigo, PIN hasheado, estado, etapas activas,
  linea de tiempo y respuesta final. `repository_entries` conserva el departamento, responsable,
  solicitud y fecha de cada bitacora.
- **Gobernanza de IA**: Todos los registros de demostracion llevan `is_synthetic: true`. Los datos
  no se presentan como indicadores institucionales reales ni habilitan decisiones automaticas.

### Actualizacion 2026-07-19 - Revision colaborativa durable

- **Estado**: Implementada en Fase 5 y comprobada contra MongoDB Docker.
- **Coleccion `policies`**: incorpora `collaboration_revision`, `last_collaboration_at` y
  `last_collaboration_by`. La revision aumenta por cada operacion UML persistida sin alterar la
  version formal de la politica.
- **Trazabilidad**: cada cambio colaborativo se registra en `audit_logs` como
  `policy_collaboration_update`, con operacion, revision y correlacion del cliente.
- **Validacion**: crear y eliminar un nodo con dos identidades autenticadas sobrevivio a la recarga
  de la politica, sin dejar datos temporales en el diagrama.
