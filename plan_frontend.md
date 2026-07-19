# 🎨 AGENTE 3 — FRONTEND (Angular 17+)

## Identidad y Rol

| Campo | Valor |
|---|---|
| **Nombre** | Agente Frontend |
| **Archivo de avance** | `avance_frontend.md` |
| **Responsabilidad** | Implementar toda la interfaz web con Angular 17+, standalone components, Signals, diseño UX premium, integración con API REST/WebSocket |
| **Tecnologías** | Angular 17+, TypeScript, RxJS, Chart.js/D3.js, WebSocket, SCSS |
| **Directorio de trabajo** | `sgdia/frontend/` |

## Reglas de Comportamiento

1. **Antes de empezar**, leer `avance_frontend.md` para retomar donde quedó.
2. **Al completar cada tarea**, registrar en `avance_frontend.md` con timestamp y estado.
3. **No modificar** archivos en `backend/`, `mobile/`, ni `database/`.
4. **Consumir** la API del Backend vía servicios Angular (HttpClient).
5. **Usar** standalone components (no NgModules), Signals para estado reactivo.
6. **Diseño**: modo oscuro, animaciones, responsive, Google Fonts (Inter/Roboto), accesibilidad.
7. **Cada componente** debe tener IDs únicos para testing E2E.

## Métricas de Calidad

| Métrica | Objetivo |
|---|---|
| Onboarding usuario nuevo | < 1 hora |
| Carga inicial de página | < 3s |
| Tooltips contextuales | En todos los elementos interactivos |
| Modo oscuro | Completo en todas las vistas |
| Responsive | Mobile-first, breakpoints: 768px, 1024px, 1440px |
| Accesibilidad | WCAG 2.1 nivel AA |

## Dependencias con Otros Agentes

| Dependo de | Para |
|---|---|
| **Backend** | Endpoints REST disponibles (puede iniciar con mocks) |
| **Base de Datos** | Conocer la forma de los datos para interfaces TypeScript |

| Dependen de mí | Para |
|---|---|
| Nadie directamente | El Frontend es consumidor final |

---

## FASE 0 — Inicialización del Proyecto Angular (Día 1-2)

### Tarea 0.1: Crear proyecto Angular 17+
- [ ] `npx -y @angular/cli@latest new frontend --standalone --style=scss --routing --ssr=false`
- [ ] Configurar `angular.json`: assets, styles, scripts
- [ ] Instalar dependencias: `@angular/material`, `chart.js`, `socket.io-client`, `marked`

### Tarea 0.2: Sistema de Diseño Global
- [ ] `src/styles/variables.scss` — Paleta de colores (dark mode first), tipografía Inter/Roboto, spacing scale
- [ ] `src/styles/global.scss` — Reset, base styles, animaciones globales
- [ ] `src/styles/theme.scss` — Dark/light theme con CSS custom properties
- [ ] Google Fonts: importar Inter y Roboto

### Tarea 0.3: Core — Servicios Transversales
- [ ] `src/app/core/services/api.service.ts` — HttpClient base con base URL
- [ ] `src/app/core/services/auth.service.ts` — Login, logout, token storage, user state (Signal)
- [ ] `src/app/core/interceptors/auth.interceptor.ts` — Adjuntar JWT a requests
- [ ] `src/app/core/interceptors/error.interceptor.ts` — Manejo global de errores HTTP
- [ ] `src/app/core/guards/auth.guard.ts` — Proteger rutas autenticadas
- [ ] `src/app/core/guards/role.guard.ts` — Proteger por rol

### Tarea 0.4: Layout Principal
- [ ] `src/app/shared/layouts/main-layout.component.ts` — Sidebar + header + content
- [ ] `src/app/shared/components/sidebar.component.ts` — Menú lateral con navegación por módulo
- [ ] `src/app/shared/components/header.component.ts` — Avatar, notificaciones, búsqueda global
- [ ] `src/app/shared/components/loading.component.ts` — Spinner/skeleton global
- [ ] Configurar routing principal con lazy loading por módulo

---

## FASE 1 — Auth y Gestión de Usuarios: CU-01 a CU-04 (Día 2-4)

### Tarea 1.1: Pantalla de Login — CU-02
- [ ] `src/app/modules/auth/login.component.ts`
  - Formulario: email + contraseña, validaciones reactivas
  - Animación de entrada, logo, dark mode
  - Mensaje de error tras intento fallido, indicador de bloqueo
  - Redirección a dashboard según rol

### Tarea 1.2: Dashboard Principal
- [ ] `src/app/modules/dashboard/dashboard.component.ts`
  - Vista diferenciada por rol (admin ve métricas, usuario ve accesos rápidos)
  - Tarjetas con estadísticas (docs recientes, notificaciones, tareas)
  - Gráficas de resumen (Chart.js)

### Tarea 1.3: Gestión de Usuarios — CU-01
- [ ] `src/app/modules/admin/users/user-list.component.ts`
  - Tabla con paginación, filtros (rol, estado), búsqueda
  - Acciones: crear, editar, desactivar
- [ ] `src/app/modules/admin/users/user-form.component.ts`
  - Dialog/modal para crear/editar usuario
  - Asignación de rol, contraseña temporal

### Tarea 1.4: Gestión de Roles — CU-03
- [ ] `src/app/modules/admin/roles/role-manager.component.ts`
  - Lista de roles con CRUD
  - Matriz de permisos: módulo × acción (checkboxes)
  - Bloqueo visual del rol Administrador (no eliminable)

### Tarea 1.5: Logout — CU-04
- [ ] Botón en header, confirmación, limpiar token y redirigir a login

---

## FASE 2 — Repositorio Documental: CU-11 a CU-16 (Día 4-7)

### Tarea 2.1: Explorador de Documentos
- [ ] `src/app/modules/repository/document-explorer.component.ts`
  - Vista árbol de carpetas (sidebar) + lista de documentos (main area)
  - Doble vista: lista y grid con thumbnails
  - Drag & drop para mover documentos entre carpetas
  - Breadcrumb de navegación

### Tarea 2.2: Carga de Documentos — CU-11
- [ ] `src/app/modules/repository/document-upload.component.ts`
  - Drag & drop zone con animación
  - Formulario de metadatos: título, descripción, tags (autocomplete), carpeta
  - Barra de progreso multipart upload
  - Soporte múltiples archivos simultáneos

### Tarea 2.3: Búsqueda — CU-12
- [ ] `src/app/modules/repository/document-search.component.ts`
  - Barra de búsqueda global con autocompletado
  - Filtros avanzados: tipo, fecha, tags, carpeta, autor
  - Toggle: búsqueda por texto vs semántica
  - Resultados con highlight de coincidencias

### Tarea 2.4: Versiones — CU-13
- [ ] `src/app/modules/repository/document-versions.component.ts`
  - Timeline visual de versiones con autor, fecha, resumen de cambio
  - Botón restaurar versión anterior

### Tarea 2.5: Permisos — CU-14
- [ ] `src/app/modules/repository/document-permissions.component.ts`
  - Matriz usuario/rol × nivel de acceso
  - Autocompletado de usuarios al agregar permisos

### Tarea 2.6: Preview y Eliminar — CU-15, CU-16
- [ ] `src/app/modules/repository/document-preview.component.ts` — Visor inline (PDF.js, img, iframe para Office)
- [ ] Acciones de archivar/eliminar con confirmación en modal

---

## FASE 3 — Edición Colaborativa: CU-17 a CU-20 (Día 7-9)

### Tarea 3.1: Editor Colaborativo — CU-17, CU-18
- [ ] `src/app/modules/editor/collaborative-editor.component.ts`
  - Integración ONLYOFFICE via iframe con API JS
  - Indicador de usuarios conectados (avatares)
  - Auto-guardado con indicador visual

### Tarea 3.2: Comentarios — CU-19
- [ ] `src/app/modules/editor/comments-panel.component.ts`
  - Panel lateral con hilos de comentarios
  - Selección de texto → botón "Comentar"
  - Resolución de comentarios

### Tarea 3.3: Gestión de Sesión — CU-20
- [ ] Botón guardar/cerrar sesión con confirmación
- [ ] Indicador de versión generada al cerrar

---

## FASE 4 — Diagramador UML: CU-05 a CU-10 (Día 9-13)

### Tarea 4.1: Canvas UML — CU-05
- [ ] `src/app/modules/uml-designer/uml-canvas.component.ts`
  - Canvas interactivo con JointJS o Draw.io embed
  - Elementos UML 2.5: inicio, fin, actividad, decisión, fork, join, swimlane
  - Drag & drop desde paleta al canvas
  - Zoom, pan, grid, snap-to-grid

### Tarea 4.2: Paleta y Propiedades
- [ ] `src/app/modules/uml-designer/element-palette.component.ts` — Paleta lateral de elementos
- [ ] `src/app/modules/uml-designer/property-panel.component.ts` — Editor de propiedades del elemento seleccionado

### Tarea 4.3: Colaboración en Tiempo Real — CU-06
- [ ] `src/app/modules/uml-designer/collaboration-overlay.component.ts`
  - Cursores remotos con nombre/avatar
  - WebSocket para sync de cambios < 100ms
  - Indicador de conflictos resueltos

### Tarea 4.4: Publicación y Flujo — CU-07, CU-08
- [ ] `src/app/modules/uml-designer/publish-flow.component.ts`
  - Stepper: Borrador → Revisión → Aprobación → Publicada
  - Panel de aprobación para admin

### Tarea 4.5: Versiones y Exportación — CU-09, CU-10
- [ ] `src/app/modules/uml-designer/version-history.component.ts` — Comparador visual side-by-side
- [ ] `src/app/modules/uml-designer/export-dialog.component.ts` — SVG, PNG, XMI

---

## FASE 5 — Agente IA Chat: CU-21 a CU-26 (Día 13-16)

### Tarea 5.1: Interfaz de Chat — CU-21
- [ ] `src/app/modules/agent/chat-interface.component.ts`
  - Burbujas de chat con markdown rendering
  - Indicador de typing/streaming (respuesta en tiempo real)
  - Score de confianza visual por respuesta
  - Fuentes citadas (links a políticas)

### Tarea 5.2: Entrada de Audio — CU-22
- [ ] `src/app/modules/agent/audio-recorder.component.ts`
  - Botón micrófono con animación de grabación
  - Visualización waveform del audio
  - Envío y transcripción con indicador de progreso

### Tarea 5.3: Adjuntar Documentos — CU-23
- [ ] `src/app/modules/agent/file-attach.component.ts`
  - Botón clip para adjuntar PDF/Word/imagen
  - Preview del documento adjuntado

### Tarea 5.4: Historial y Feedback — CU-24, CU-25
- [ ] `src/app/modules/agent/conversation-history.component.ts` — Lista de conversaciones anteriores
- [ ] `src/app/modules/agent/feedback-widget.component.ts` — 👍/👎 + comentario por respuesta

### Tarea 5.5: Escalamiento — CU-26
- [ ] `src/app/modules/agent/escalation-panel.component.ts`
  - Botón "Hablar con un humano"
  - Transferencia de contexto

---

## FASE 6 — Dashboard de Predicciones DL: CU-27 a CU-31 (Día 16-18)

### Tarea 6.1: Dashboard Principal — CU-31
- [ ] `src/app/modules/predictions/predictions-dashboard.component.ts`
  - KPIs en tarjetas con sparklines
  - Gráficas Chart.js: rutas, cuellos de botella, anomalías
  - Filtros por rango de fechas, tipo, módulo

### Tarea 6.2: Componentes Específicos
- [ ] `route-prediction.component.ts` — CU-27: Visualización de ruta óptima (diagrama de flujo)
- [ ] `bottleneck-alerts.component.ts` — CU-28: Alertas con semáforo de riesgo
- [ ] `anomaly-timeline.component.ts` — CU-29: Timeline de anomalías
- [ ] `resource-optimizer.component.ts` — CU-30: Tabla de asignación sugerida

---

## FASE 7 — Reportes: CU-32 a CU-36 (Día 18-20)

### Tarea 7.1: Constructor de Reportes — CU-32
- [ ] `src/app/modules/reports/report-builder.component.ts`
  - Wizard por pasos: tipo → parámetros → formato → generar
  - Preview antes de generar

### Tarea 7.2: Reporte por Voz — CU-33
- [ ] `src/app/modules/reports/voice-report.component.ts`
  - Grabación de instrucción de voz
  - Confirmación de parámetros extraídos antes de generar

### Tarea 7.3: Programación y Visualización — CU-34, CU-35
- [ ] `report-scheduler.component.ts` — Configurar recurrencia (diario/semanal/mensual)
- [ ] `report-viewer.component.ts` — Gráficas interactivas Chart.js/D3 con drill-down

### Tarea 7.4: Plantillas — CU-36
- [ ] `template-manager.component.ts` — CRUD de plantillas de reporte

---

## FASE 8 — Notificaciones y Auditoría: CU-37 a CU-40 (Día 20-22)

### Tarea 8.1: Notificaciones — CU-37
- [ ] `src/app/shared/components/notification-bell.component.ts` — Badge + dropdown
- [ ] `src/app/modules/notifications/notification-center.component.ts` — Centro completo
- [ ] WebSocket service para push en tiempo real con toast animations

### Tarea 8.2: Auditoría — CU-38, CU-39
- [ ] `src/app/modules/audit/audit-log-viewer.component.ts` — Tabla con filtros avanzados, exportar CSV/JSON
- [ ] `src/app/modules/audit/traceability-timeline.component.ts` — CU-39: Línea de tiempo visual de un documento/trámite

### Tarea 8.3: Configuración — CU-40
- [ ] `src/app/modules/audit/system-settings.component.ts`
  - Formulario de umbrales IA, retención, notificaciones
  - Hot-reload sin reinicio

---

## FASE 10 — Polish y Testing E2E (Día 24-25)

### Tarea 10.1: Animaciones y microinteracciones
- [ ] Hover effects en todos los botones y tarjetas
- [ ] Transiciones de página suaves
- [ ] Skeletons de carga en todas las listas/tablas

### Tarea 10.2: Responsive final
- [ ] Verificar todas las vistas en 768px, 1024px, 1440px

### Tarea 10.3: Tests E2E con Playwright
- [ ] Flujo: login → dashboard → upload doc → buscar → chat IA → logout
