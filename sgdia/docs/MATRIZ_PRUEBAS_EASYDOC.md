# Matriz de pruebas EASYDOC

Actualizado: 20 de julio de 2026

| ID | Escenario | Resultado | Evidencia |
| --- | --- | --- | --- |
| INT-01 | Compose con servicios base | Correcto | API, MongoDB, Redis, MinIO y OnlyOffice saludables |
| INT-02 | Seed institucional repetible | Correcto | 10 politicas, 30 artefactos y 1,409 solicitudes sinteticas de marzo a julio |
| INT-03 | Login administrador y permisos | Correcto | JWT con rol Administrador y 21 permisos |
| INT-04 | Invitado crea tramite | Correcto | Codigo y PIN de recibo emitidos |
| INT-05 | Adjuntos obligatorios | Correcto | 3 adjuntos; tarea retenida hasta completar requisitos |
| INT-06 | Seguimiento publico | Correcto | Estado y etapa actual consultables con codigo mas PIN |
| INT-07 | Tarea de funcionario | Correcto | Cambio a completada y avance a siguiente actividad UML |
| INT-08 | Operaciones WebSocket UML | Correcto | Dos usuarios, presencia 2 y `node.update` recibido |
| INT-09 | Reconexion WebSocket | Correcto | Conexion cerrada y reabierta conserva presencia unica |
| INT-10 | Conflicto de version | Correcto | Guardado con revision desactualizada devuelve HTTP 409 |
| INT-11 | Auditoria de politica | Correcto | Evento `policy_update` persistido |
| INT-12 | Orientador publico offline | Correcto | Consulta de homologacion recomienda la politica publicada correspondiente |
| INT-13 | Extraccion documental local | Correcto | Adjunto de identidad detecta correo, CI y nombre sin servicio externo |
| INT-14 | Entrenamiento temporal local | Correcto | 556 muestras Mar-Jun, 231 de julio; reporte y artefacto persistidos |
| INT-15 | Indicadores de riesgo sin datos simulados | Correcto | Cargas desde artefacto local y anomalias desde `/predictions/anomalies` |
| INT-16 | Configuracion de entorno web local | Correcto | Build Angular incorpora `http://localhost:8000/api` para API y WebSocket |
| INT-17 | Recuperacion semantica y gobierno IA | Correcto | Guia local recomienda Homologacion; contrato de readiness confirma automatizacion bloqueada con 0/200 flujos reales |
| INT-18 | OCR local multiformato | Correcto | DOCX/XLSX/imagen cubiertos por pruebas; PDF escaneado devuelve `local_pdf_ocr` desde la imagen Docker reconstruida |
| INT-19 | Persistencia UML por WebSocket | Correcto | Dos cuentas reales, presencia 2, crear/eliminar nodo, acuse de revision y recarga API sin guardado manual |
| INT-20 | Renderizado responsive del diagramador | Correcto | Navegador local, contador 0 sin pares, paleta desplazable, carriles y lienzo sin errores de consola |
| INT-21 | Distribucion local aislada | Correcto | `local/verify.ps1`: API saludable, MongoDB y Redis conectados y web en 4300; seed con 10 politicas y 1,409 solicitudes |
| Q-01 | Ruff y pruebas FastAPI | Correcto | `ruff` y 64 pruebas correctas |
| Q-02 | Calidad Angular | Correcto | `npm run lint`, `format:check`, `build` |
| Q-03 | Calidad Flutter | Correcto | Analizador, prueba de widgets y formato correctos |

## Pendientes de aceptacion manual

- Dos navegadores con personas reales editando el diagrama durante una sesion prolongada y prueba UX
  de reconexion en una red inestable.
- Recorrido movil en dispositivo Android/iOS fisico con red local.
- Push FCM una vez disponibles los archivos y credenciales del proyecto Firebase.
- OCR local sobre muestras anonimizadas institucionales de PDF, imagen, DOCX y XLSX.
- Reentrenamiento con eventos reales anonimizados y revision humana de las recomendaciones.
