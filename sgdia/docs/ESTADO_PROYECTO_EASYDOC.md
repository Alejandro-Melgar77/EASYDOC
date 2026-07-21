# Estado del proyecto EASYDOC

Actualizado: 20 de julio de 2026

## Estado actual

Fase activa: **Fase 5 - correcciones y aceptacion operativa**.

El alcance central de la fase esta implementado y validado en el entorno local Docker.
Los defectos P0 encontrados durante la integracion siguen corregidos. La segunda iteracion de
Fase 5 esta disponible localmente; los resultados sinteticos no se presentan como indicadores
institucionales y las integraciones que dependen de terceros estan registradas como pendientes.

## Hitos completados

- Docker Compose validado con MongoDB, Redis, MinIO, OnlyOffice y API EASYDOC saludables.
- Corregidos el healthcheck de la API, la compatibilidad de Beanie con Motor y la compatibilidad
  entre `passlib` y `bcrypt` mediante `bcrypt>=4.0.1,<4.1.0`.
- Seed idempotente ejecutado con datos sinteticos identificados como tales para marzo-julio 2026:
  10 politicas publicadas, 30 artefactos editables, 1,409 solicitudes y repositorios por
  departamento y responsable.
- Seed base idempotente de roles, administrador y configuracion. Los roles existentes se normalizan
  al contrato actual para que los permisos no dependan de datos historicos.
- Autenticacion corregida: JWT incorpora `roles`, permisos normalizados e indicador de usuario activo.
- WebSocket de politicas reforzado: JWT y permiso `policies:write`, presencia real en Redis con TTL,
  Pub/Sub para operaciones entre instancias, heartbeat y eliminacion del canal legado inseguro.
- Colaboracion real verificada con dos cuentas autorizadas: presencia de 2 personas, operacion UML
  `node.update` recibida por el segundo editor y reconexion validada.
- Persistencia colaborativa UML endurecida: cada operacion de nodo, enlace, carril o formulario se
  valida y se guarda antes de difundirse. El editor confirma "Cambios sincronizados", reintenta la
  conexion y conserva la cola breve de operaciones durante una reconexion.
- Persistencia versionada validada: guardado, recarga, auditoria y conflicto optimista `409`.
- Tramites publicos implementados: catalogo, formulario dinamico, recibo con codigo y PIN, adjuntos,
  seguimiento y linea de tiempo.
- Integridad del ingreso documental: una politica con requisitos no asigna tareas hasta que todos los
  adjuntos obligatorios esten cargados; una politica sin requisitos sigue iniciando de inmediato.
- Tareas de funcionarios implementadas: lista propia, cambio de estado, avance al siguiente nodo UML,
  evento normalizado de workflow y notificacion interna autenticada.
- Registro seguro de dispositivo movil preparado. FCM permanece desactivado hasta disponer de la
  configuracion Firebase real.
- Flutter enfocado al MVP movil: invitado (catalogo, formulario, adjuntos y seguimiento) y funcionario
  (inicio de sesion, tareas y estados). No incluye diagramador, repositorio completo ni agente IA.
- Configuracion movil corregida para el backend real `/api` y emulador Android local `10.0.2.2`.
- Cliente movil WebSocket preparado para recibir notificaciones JSON autenticadas.
- Orientador publico local y offline: clasifica consultas contra 45 casos agenticos sinteticos,
  recomienda una politica publicada, sus requisitos y el formulario correspondiente.
- Inteligencia documental local incorporada al adjunto: extrae texto disponible y campos
  identificables (correo, CI, registro universitario, fecha de nacimiento, genero y nombre),
  marca los casos incompletos para revision y no envia archivos a servicios externos.
- Datos de entrenamiento Fase 5 generados de forma repetible: 45 casos agenticos, 787 flujos,
  556 muestras de entrenamiento de marzo-junio y 231 de validacion de julio.
- Linea base local evaluada: coincidencia de rutas de 1.000 y error absoluto medio de duracion de
  0.587 dias sobre la separacion temporal sintetica. Su procedencia sintetica esta expuesta en la UI.
- Panel de riesgos conectado al artefacto y detectores locales; se eliminaron cargas y anomalias
  generadas aleatoriamente en los widgets de operacion.
- Interfaz web de atencion publica y paneles de riesgo refinados con lenguaje visual EASYDOC:
  bandas institucionales, jerarquia de expediente, estados visibles y superficies operativas compactas.
- Revision visual del diagramador en navegador local: el contador inicia en 0 sin coeditores reales,
  la paleta completa conserva desplazamiento y el lienzo UML carga sin errores de consola.
- Flutter adopta la misma identidad visual diplomatica en catalogo, seguimiento y tareas, sin
  ampliar el alcance movil fuera de sus recorridos definidos.
- Entorno web local corregido: Angular usa `http://localhost:8000/api` y el WebSocket local por
  defecto, evitando que los recorridos de desarrollo dependan de una URL de demostracion inexistente.
- Recuperacion semantica local incorporada: reemplaza embeddings nulos por vectores hash-TF-IDF
  deterministas de 256 dimensiones y el RAG simulado por evidencia de documentos locales.
- Extraccion multiformato local reforzada: TXT, DOCX, XLSX, imagen y PDF escaneado conservan motor,
  paginas procesadas, estado y marca de revision humana. Tesseract y la prueba PDF local funcionaron
  dentro del contenedor en ejecucion.
- Prediccion y riesgo sin simulaciones: la ruta heuristica es determinista, los cuellos se calculan
  desde timestamps reales y las sugerencias de carga nunca se ejecutan automaticamente.
- Gobierno de entrenamiento visible: `easydoc_training_governance_v1` bloquea automatizacion con
  0 de 200 flujos reales anonimizados; el panel IA lo comunica de forma explicita.
- Distribucion `local/` incorporada: sincroniza backend y frontend canonicos, levanta sus
  dependencias funcionales en puertos aislados (`4300` y `8100`) y ejecuta la semilla idempotente.
  `local/update.ps1` es el procedimiento obligatorio para reflejar los proximos cambios aprobados.

## Validacion integrada registrada

- Invitado: crea el tramite `ED-2026-5AE96D1E`, recibe PIN, carga 3 adjuntos y lo consulta.
- Funcionario: recibe la tarea despues de completar requisitos, la finaliza y el seguimiento cambia a
  `in_progress` en `Revision de requisitos`.
- Colaboracion: dos usuarios autenticados sobre la misma politica informan presencia real de 2 y
  transmiten una operacion UML.
- Concurrencia: politica pasa de version 1 a 2; un guardado con la version anterior devuelve `409`.
- Auditoria: se registra el evento `policy_update` asociado a la politica validada.
- Persistencia colaborativa: dos cuentas distintas crearon y eliminaron un nodo por WebSocket; la
  segunda sesion recibio ambas operaciones y la recarga API confirmo las revisiones 1 y 2 sin usar
  el boton de guardado manual.
- IA local: sesion administrativa consulta `model-status` y `training-readiness`; confirma 787
  flujos sinteticos, automatizacion bloqueada y umbral de 200 flujos reales.
- OCR PDF: un PDF escaneado generado en memoria devuelve `local_pdf_ocr`, una pagina y texto local.

## Calidad comprobada

| Area | Resultado |
| --- | --- |
| FastAPI | `ruff` correcto y 66 pruebas correctas |
| Angular | ESLint, Prettier y build correctos |
| Flutter | `flutter analyze`, pruebas y `dart format` correctos |
| Docker | Backend, MongoDB, Redis, MinIO y OnlyOffice saludables |
| Distribucion local | Correcta: API, web, MongoDB y Redis verificados en puertos aislados |

El detalle reproducible esta en `docs/MATRIZ_PRUEBAS_EASYDOC.md`.

## Alcance de la siguiente fase

1. Completar la aceptacion exploratoria con usuarios reales en dos navegadores y registrar los
   defectos UX P1/P2 restantes del diagramador y formulario.
2. Entrenar y comparar el modelo local con eventos reales anonimizados; la linea base sintetica se
   conserva separada y no habilita decisiones automaticas.
3. Integrar Firebase real y activar notificaciones push para Android/iOS.
4. Cerrar Fase 5 y abrir Fase 6 de gobierno IA y validacion institucional.

## Archivos principales de esta fase

- `backend/app/services/request_service.py`
- `backend/app/routers/requests.py`
- `backend/app/services/policy_collaboration.py`
- `backend/app/services/policy_collaboration_persistence.py`
- `backend/app/core/websocket_auth.py`
- `backend/app/routers/ws_policy_collaboration.py`
- `backend/app/services/auth_service.py`
- `backend/app/services/public_guidance_service.py`
- `backend/app/services/document_intelligence_service.py`
- `backend/app/ml/agentic_dataset.py`
- `backend/app/ml/operational_training.py`
- `backend/app/ml/semantic_retriever.py`
- `backend/app/ml/training_governance.py`
- `backend/scripts/generate_phase5_assets.py`
- `backend/app/ml/training_data/easydoc_agentic_cases.json`
- `backend/app/ml/artifacts/easydoc_training_report.json`
- `backend/app/ml/artifacts/easydoc_training_readiness.json`
- `backend/scripts/seed_easydoc_demo.py`
- `backend/scripts/seed_db.py`
- `mobile/sgdia_mobile/lib/features/requests/`
- `mobile/sgdia_mobile/lib/features/tasks/`
- `mobile/sgdia_mobile/lib/core/network/websocket_client.dart`
