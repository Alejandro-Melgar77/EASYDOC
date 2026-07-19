# Plan de implementacion EASYDOC

Actualizado: 19 de julio de 2026

## Mapa de fases

| Fase | Resultado |
| --- | --- |
| 0. Base tecnica | Compose, MongoDB, Redis, MinIO, modelos e indices iniciales |
| 1. Politicas y UML | Politicas versionadas, biblioteca, formularios y diagramador UML 2.5+ |
| 2. Colaboracion | WebSocket de politicas, presencia real, operaciones UML y permisos |
| 3. Datos institucionales | Seed sintetico marzo-julio, politicas, formularios, repositorios y eventos |
| 4.5. Integracion real y base movil | Completada en local: contratos, tramites, tareas, pruebas integradas y MVP Flutter |
| 5. IA local y operacion ampliada | Activa, iteracion 2 completada: OCR multiformato, recuperacion semantica local, motores reproducibles y gobierno de entrenamiento |
| 6. Gobierno IA y validacion institucional | Planificada: datos reales anonimizados, revision humana, sesgo, deriva y validacion piloto |
| 7. Despliegue piloto y operacion | Planificada: FCM real, despliegue durable, monitoreo y aceptacion institucional |

## Fase 4.5: alcance entregado

1. Contratos publicos para invitado: catalogo, detalle de servicio, creacion de tramite, adjuntos y
   seguimiento con codigo y PIN.
2. Contratos autenticados para funcionario: tareas propias, transicion de estado y dispositivos.
3. Colaboracion UML autorizada por JWT y permiso, con Redis para presencia y relay entre instancias.
4. Semilla repetible y marcada como sintetica, con rango operativo marzo-julio 2026.
5. Aplicacion Flutter limitada deliberadamente a los recorridos definidos para movil.
6. Calidad automatizada y prueba de aceptacion API/WebSocket registrada.

## Fase 5: IA local y operacion ampliada

### Entregado en la iteracion 1

1. Corpus agentico local con 45 casos sinteticos y plan explicable: clasificar, recomendar politica,
   presentar requisitos y abrir formulario dinamico.
2. Orientador publico offline que consulta ese corpus y las politicas publicadas, sin dependencia de un LLM remoto.
3. Linea base de rutas/riesgo `offline_statistical_baseline`, entrenada con marzo-junio y validada
   cronologicamente con julio: 556/231 muestras, coincidencia de ruta 1.000 y MAE de 0.587 dias.
4. Extraccion local inicial de archivos de texto y campos documentales; persiste el resultado junto al adjunto.
5. Artefactos, reporte, conocimiento agentico y snapshot operacional sembrados de forma idempotente.
6. Paneles web y pantallas moviles refinados con identidad EASYDOC y datos de riesgo sin aleatoriedad.

### Entregado en la iteracion 2

1. Recuperacion semantica local `local_hashing_tfidf_v1`: vector determinista de 256 dimensiones,
   sin API externa y con coincidencia 1.000 sobre los 45 casos sinteticos versionados.
2. El RAG legado deja de usar documentos y respuestas simuladas; responde solo con documentos locales
   recuperados y advierte cuando no existe evidencia suficiente.
3. OCR y extraccion local verificable para texto, DOCX, XLSX, imagen y PDF escaneado. El resultado
   conserva motor, estado, paginas procesadas y necesidad de revision humana.
4. Predictor de ruta sin aleatoriedad; cuellos de botella calculados desde la entrada real al nodo;
   sugerencias de carga explicables y sin reasignacion automatica.
5. Artefacto de gobierno `easydoc_training_governance_v1`: bloquea la automatizacion mientras haya
   0 de 200 flujos reales anonimizados aprobados.
6. Panel web de riesgos muestra la frontera de control humano y el contrato
   `GET /api/predictions/training-readiness`.

### Pendiente para cerrar la fase

1. Consolidar eventos reales anonimizados y reentrenar contra la linea base sintetica antes de exponer
   recomendaciones operativas.
2. Conectar FCM despues de recibir las credenciales Firebase y verificar push en dispositivos reales.
3. Ejecutar pruebas visuales multiusuario de larga duracion y cerrar incidencias UX priorizadas.

## Criterio de cierre de Fase 5

- Modelo local medido con datos reales anonimizados y metricas reproducibles, comparado contra la linea base.
- OCR con casos de prueba para PDF, imagen, DOCX y XLSX sobre la imagen Docker reconstruida.
- Push autentico entregado a Android/iOS configurados.
- Reporte de aceptacion de usuario, seguridad y rendimiento actualizado.

## Fase 6: Gobierno IA y validacion institucional

Se inicia al cerrar los pendientes externos de Fase 5. Incluye anonimizar eventos reales, validar
calidad y sesgo por politica/departamento, monitorear deriva, establecer aprobacion humana por
version de modelo y realizar un piloto controlado sin automatizar asignaciones.

## Fase 7: Despliegue piloto y operacion

Incluye la configuracion Firebase real, push en dispositivos fisicos, imagenes Docker durables,
monitoreo operativo y la aceptacion institucional antes de cualquier despliegue productivo.
