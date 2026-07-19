# Contratos movil Fase 4.5

Base API local: `http://localhost:8000/api`. En el emulador Android se usa por defecto
`http://10.0.2.2:8000/api`; el manifest de debug permite HTTP solo para desarrollo local.

## Invitado

| Metodo y ruta | Uso |
| --- | --- |
| `GET /public/services` | Catalogo de politicas publicadas |
| `GET /public/services/{policy_id}` | Formulario dinamico y requisitos |
| `POST /public/services/{policy_id}/requests` | Crea tramite y devuelve codigo mas PIN |
| `POST /public/requests/{tracking_code}/attachments` | Carga un archivo con `receipt_pin` y `metadata.requirement_id` |
| `GET /public/requests/{tracking_code}?receipt_pin=...` | Seguimiento, adjuntos y linea de tiempo |

## Funcionario

Todas las rutas usan `Authorization: Bearer <JWT>`.

| Metodo y ruta | Uso |
| --- | --- |
| `GET /tasks/me` | Cola de tareas asignadas al usuario autenticado |
| `PATCH /tasks/{task_id}/status` | Actualiza estado y avanza el workflow cuando termina |
| `POST /devices` | Registra token de dispositivo de forma autenticada |
| `DELETE /devices/{device_id}` | Desactiva un dispositivo propio |

## Notificaciones

Canal autenticado: `ws://localhost:8000/ws/notifications?token=<JWT>`.

El backend guarda dispositivos y emite notificaciones internas por WebSocket. FCM esta preparado en
la arquitectura, pero no se activa sin configuracion Firebase real. La aplicacion Flutter no debe
enviar un token ficticio como token de produccion.
