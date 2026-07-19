# Contrato de adaptación del modelo para EASYDOC

**Referencia conservada:** `C:\Users\Usuario\Documents\SW1 1-2026\modelos\para el segundo parcial\documento 1--2026\Sistema de gestion de tramites y politicas de negocio (1).docx`  
**SHA-256:** `AA325F56C960A66A0FADA012454FA9C1B984E044B93925BEF6884FFB853CB945`  
**Evidencia:** inventario de 738 párrafos y 42 tablas; 99 páginas renderizadas mediante exportación PDF de Word; dos secciones; 93 imágenes en línea y 4 ancladas; TOC y campo PAGE presentes.

## Elementos conservados

- La primera página (carátula) se mantiene sin ningún cambio, conforme a la instrucción del usuario.
- Las páginas de índice y el campo TOC se conservan como estructura de navegación. El campo se actualiza en Word al finalizar.
- Se preservan la plantilla, los estilos `normal`, `Heading 1` a `Heading 4`, la numeración multinivel, el tamaño Carta y el pie con número de página.
- El cuerpo heredado comienza en el primer `Heading 1` con texto `PERFIL`; a partir de ese punto se sustituye todo el contenido y sus artefactos por contenido de EASYDOC.

## Patrón del documento resultante

- Capítulos principales con `Heading 1`: Perfil, Marco teórico, Captura de requisitos, Análisis, Diseño, Implementación, Pruebas y Bibliografías.
- Subtemas y casos de uso con `Heading 2` a `Heading 4`, para que aparezcan en el índice existente.
- Texto académico con citas autor-fecha y referencias APA 7.
- Tablas de especificación de CU, trazabilidad, diseño de datos, pruebas y manual; figuras con pie centrado.
- Diagramas nuevos de casos de uso, actividades, dominio, secuencia, componentes y despliegue; capturas reales de la interfaz local de EasyDoc.

## Límites y decisiones documentadas

- La maqueta posterior al índice se reconstruye con las reglas visuales de la referencia porque el contenido funcional y los diagramas del proyecto son distintos.
- El modelo contiene espaciados y elementos flotantes propios; no se preservan los artefactos del contenido antiguo. La carátula, el índice, las fuentes, encabezados/pies y la jerarquía de estilos sí permanecen como autoridad de formato.
- El entorno local de EASYDOC disponible en `http://localhost:4200` se usa para las capturas. Las afirmaciones de función se contrastan con la documentación y la estructura de código del repositorio.
