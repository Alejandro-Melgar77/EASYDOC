# Registro de incidencias EASYDOC

Actualizado: 20 de julio de 2026

## Corregidas en Fase 4.5

| ID | Prioridad | Incidencia | Correccion |
| --- | --- | --- | --- |
| INC-01 | P0 | `bcrypt` moderno bloqueaba el seed de administrador con passlib 1.7.x | Dependencia fijada a `bcrypt>=4.0.1,<4.1.0` |
| INC-02 | P0 | Beanie 2.x fallaba con la inicializacion Motor existente | Dependencia acotada a Beanie 1.x |
| INC-03 | P0 | Healthcheck consultaba una ruta inexistente | Corregido a `/api/health` |
| INC-04 | P0 | JWT no incluia lista `roles` y roles historicos usaban otro formato de permisos | Normalizacion de rol, permisos y seed idempotente |
| INC-05 | P0 | Tareas se asignaban antes de adjuntos requeridos | Entrada condicionada a requisitos documentales completos |
| INC-06 | P0 | Canales WebSocket heredados aceptaban identidad no derivada del JWT | Canales reemplazados por autenticacion JWT y permisos |
| INC-12 | P1 | El panel de riesgos mostraba cargas predefinidas y anomalias aleatorias | Widgets conectados al artefacto local y al detector autenticado |
| INC-15 | P0 | El entorno web base apuntaba a una API de demostracion inexistente | Configuracion base y de desarrollo apuntan al backend Docker local |
| INC-09 | P1 | Extraccion documental local limitada | Corregida en codigo: OCR/parser local para TXT, DOCX, XLSX, imagen y PDF escaneado, con procedencia y revision humana |
| INC-13 | P1 | No habia soporte multiformato verificable | Corregida en codigo y en la imagen Docker reconstruida |
| INC-16 | P1 | Motor PDF no estaba horneado en la imagen | Corregido: `PyMuPDF` se instala desde `requirements-local-ai.txt` en una capa Docker reproducible |
| INC-17 | P0 | Las operaciones UML se veian en otro navegador pero dependian del guardado manual para persistir | Corregido: validacion, revision colaborativa, auditoria y acuse WebSocket antes de difundir la operacion |
| INC-18 | P1 | Los workers Celery locales heredaban un healthcheck HTTP que solo corresponde a la API | Corregido: healthcheck desactivado en worker y beat; los procesos se supervisan por su propio estado de ejecucion |

## Abiertas y priorizadas

| ID | Prioridad | Estado | Accion siguiente |
| --- | --- | --- | --- |
| INC-07 | P1 | Pendiente | Prueba visual exploratoria prolongada con dos navegadores reales |
| INC-08 | P1 | Pendiente | Activar FCM al recibir configuracion Firebase y probar push fisico |
| INC-10 | P2 | Pendiente | Habilitar Developer Mode de Windows antes de `flutter pub get` y build con plugins |
| INC-11 | P2 | Pendiente | Advertencia de terceros de maxgraph durante build; la aplicacion desactiva `GraphView.allowEval` |
| INC-14 | P1 | Pendiente | La linea base de IA usa eventos sinteticos; reentrenar con datos reales anonimizados y comparar metricas |
