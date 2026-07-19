# 📱 AGENTE 4 — MÓVIL (Flutter)

## Identidad y Rol

| Campo | Valor |
|---|---|
| **Nombre** | Agente Móvil |
| **Archivo de avance** | `avance_movil.md` |
| **Responsabilidad** | Implementar la app móvil iOS + Android con Flutter, consumiendo la misma API REST del backend |
| **Tecnologías** | Flutter (Dart), Riverpod/Bloc, Dio, WebSocket, Firebase Push |
| **Directorio de trabajo** | `sgdia/mobile/` |

## Reglas de Comportamiento

1. **Antes de empezar**, leer `avance_movil.md` para retomar donde quedó.
2. **Al completar cada tarea**, registrar en `avance_movil.md` con timestamp y estado.
3. **No modificar** archivos en `backend/`, `frontend/`, ni `database/`.
4. **Consumir** la misma API REST que el frontend (sin endpoints específicos para móvil).
5. **Esperar** a que el Backend tenga endpoints listos (puede iniciar con mocks mientras tanto).
6. **Diseño**: Material Design 3, dark mode, animaciones fluidas, offline-first donde aplique.

## Métricas de Calidad

| Métrica | Objetivo |
|---|---|
| FPS en animaciones | 60 fps constantes |
| Tiempo inicio app | < 2s en cold start |
| Soporte offline | Caché de docs y notificaciones |
| Push notifications | Firebase Cloud Messaging |
| Tamaño APK/IPA | < 30 MB |
| Compatibilidad | Android 8+ / iOS 14+ |

## Dependencias con Otros Agentes

| Dependo de | Para |
|---|---|
| **Backend** | Endpoints REST disponibles (puede mockear mientras tanto) |
| **Base de Datos** | Conocer modelos para crear clases Dart equivalentes |

| Dependen de mí | Para |
|---|---|
| Nadie | La app móvil es consumidor final |

## Alcance MVP Móvil

> [!IMPORTANT]
> La app móvil NO replica el 100% del frontend web. Se enfoca en las funcionalidades más usadas en movilidad:
> - ✅ Auth (login/logout)
> - ✅ Repositorio documental (buscar, ver, descargar)
> - ✅ Chat con agente IA (texto + audio)
> - ✅ Notificaciones push
> - ✅ Dashboard de predicciones (resumen)
> - ✅ Reportes (solicitar y ver)
> - ❌ Diagramador UML (solo web por complejidad del canvas)
> - ❌ Edición colaborativa Word/Excel (requiere ONLYOFFICE, solo web)

---

## FASE 0 — Inicialización del Proyecto Flutter (Día 1-3)

### Tarea 0.1: Crear proyecto Flutter
- [ ] `flutter create sgdia_mobile` dentro de `sgdia/mobile/`
- [ ] Configurar `pubspec.yaml`: dependencias (dio, riverpod, go_router, flutter_secure_storage, socket_io_client, firebase_messaging, cached_network_image, etc.)
- [ ] Configurar flavors: `dev`, `staging`, `prod`

### Tarea 0.2: Arquitectura Base
- [ ] `lib/core/config/` — Environment config, API base URL
- [ ] `lib/core/network/api_client.dart` — Cliente HTTP con Dio, interceptors (JWT, error, retry)
- [ ] `lib/core/network/websocket_client.dart` — Cliente WebSocket para notificaciones y chat
- [ ] `lib/core/storage/secure_storage.dart` — Almacenamiento seguro de tokens
- [ ] `lib/core/router/app_router.dart` — GoRouter con guards de auth

### Tarea 0.3: Sistema de Diseño
- [ ] `lib/core/theme/app_theme.dart` — ThemeData con Material Design 3, dark/light
- [ ] `lib/core/theme/colors.dart` — Paleta de colores consistente con el web
- [ ] `lib/core/theme/typography.dart` — Text styles (Inter/Roboto)
- [ ] `lib/shared/widgets/` — Botones, cards, inputs, loading reutilizables

### Tarea 0.4: Modelos Dart
- [ ] `lib/core/models/user.dart` — Equivalente al schema MongoDB
- [ ] `lib/core/models/document.dart`
- [ ] `lib/core/models/notification.dart`
- [ ] `lib/core/models/conversation.dart`
- [ ] Todos con `fromJson()` / `toJson()` usando `json_serializable`

---

## FASE 1 — Auth: CU-01 a CU-04 (Día 3-5)

### Tarea 1.1: Pantalla de Login — CU-02
- [ ] `lib/features/auth/presentation/login_screen.dart`
  - Formulario: email + contraseña con validaciones
  - Animación de logo, soporte dark mode
  - Biometría (fingerprint/face) para re-login (Flutter local_auth)
  - Mensaje de error y bloqueo visual tras 5 intentos

### Tarea 1.2: Servicio de Auth
- [ ] `lib/features/auth/data/auth_repository.dart`
  - Login, logout, refresh token, almacenamiento seguro
  - Auto-refresh de JWT antes de expiración
- [ ] `lib/features/auth/providers/auth_provider.dart` — Estado global de autenticación

### Tarea 1.3: Splash y Onboarding
- [ ] `lib/features/auth/presentation/splash_screen.dart` — Check token → auto-login o login
- [ ] Transición animada al dashboard

### Tarea 1.4: Logout — CU-04
- [ ] Opción en drawer/settings, limpiar tokens, redirigir a login

---

## FASE 2 — Repositorio Documental: CU-11, CU-12, CU-15 (Día 5-8)

### Tarea 2.1: Explorador de Documentos
- [ ] `lib/features/repository/presentation/document_list_screen.dart`
  - Lista scrollable con pull-to-refresh
  - Vista carpetas + archivos con iconos por tipo
  - Infinite scroll pagination

### Tarea 2.2: Búsqueda — CU-12
- [ ] `lib/features/repository/presentation/document_search_screen.dart`
  - SearchBar con debounce
  - Filtros: tipo, fecha, tags
  - Resultados con highlight

### Tarea 2.3: Preview de Documentos — CU-15
- [ ] `lib/features/repository/presentation/document_preview_screen.dart`
  - PDF viewer (flutter_pdfview)
  - Visor de imágenes con zoom
  - Descarga a almacenamiento local
  - Compartir con apps nativas (share_plus)

### Tarea 2.4: Cache Offline
- [ ] Caché local de documentos recientes
- [ ] Indicador de docs disponibles offline

---

## FASE 5 — Agente IA Chat: CU-21 a CU-24 (Día 8-12)

### Tarea 5.1: Chat Interface — CU-21
- [ ] `lib/features/agent/presentation/chat_screen.dart`
  - Burbujas de chat con markdown rendering
  - Streaming de respuesta via WebSocket
  - Fuentes citadas con links

### Tarea 5.2: Audio Input — CU-22
- [ ] `lib/features/agent/presentation/widgets/audio_recorder.dart`
  - Botón micrófono con hold-to-record
  - Waveform animation durante grabación
  - Envío del audio al endpoint /agent/audio

### Tarea 5.3: Adjuntar Documento — CU-23
- [ ] Botón para adjuntar desde galería, cámara o archivos del dispositivo
- [ ] Preview del adjunto antes de enviar

### Tarea 5.4: Historial — CU-24
- [ ] `lib/features/agent/presentation/conversation_list_screen.dart`
  - Lista de conversaciones con fecha y preview del último mensaje
  - Buscar en historial

### Tarea 5.5: Feedback — CU-25
- [ ] Widget 👍/👎 en cada respuesta del agente

---

## FASE 6 — Dashboard Predicciones: CU-31 (Día 12-14)

### Tarea 6.1: Dashboard Resumen
- [ ] `lib/features/predictions/presentation/dashboard_screen.dart`
  - KPI cards con valores y tendencia (up/down arrow)
  - Gráfica de anomalías (fl_chart)
  - Lista de alertas de cuellos de botella
  - Pull-to-refresh

### Tarea 6.2: Detalle de Predicción
- [ ] `lib/features/predictions/presentation/prediction_detail_screen.dart`
  - Detalle con score, tipo, entidad afectada
  - Acción: marcar como reconocida

---

## FASE 7 — Reportes: CU-32, CU-33, CU-35 (Día 14-16)

### Tarea 7.1: Solicitar Reporte — CU-32
- [ ] `lib/features/reports/presentation/report_request_screen.dart`
  - Formulario: tipo, parámetros, formato
  - Estado: pendiente → generando → listo

### Tarea 7.2: Reporte por Voz — CU-33
- [ ] Botón micrófono → grabar instrucción → confirmar parámetros → generar

### Tarea 7.3: Ver Reportes — CU-35
- [ ] `lib/features/reports/presentation/report_viewer_screen.dart`
  - Gráficas interactivas (fl_chart)
  - Descargar PDF/Excel al dispositivo

---

## FASE 8 — Notificaciones: CU-37 (Día 16-18)

### Tarea 8.1: Push Notifications
- [ ] Configurar Firebase Cloud Messaging (FCM) para Android e iOS
- [ ] `lib/features/notifications/data/notification_service.dart`
  - Registro de token FCM en el backend
  - Manejo de notificaciones en foreground/background

### Tarea 8.2: Centro de Notificaciones
- [ ] `lib/features/notifications/presentation/notification_list_screen.dart`
  - Lista con badge de no-leídas
  - Tap → navegar a la entidad relacionada
  - Marcar como leída, marcar todas como leídas

### Tarea 8.3: WebSocket de Notificaciones
- [ ] Conexión WebSocket persistente para notificaciones in-app en tiempo real
- [ ] Toast/snackbar al recibir notificación con la app abierta

---

## FASE 10 — Polish y Testing (Día 20-22)

### Tarea 10.1: Animaciones y UX
- [ ] Hero animations entre pantallas
- [ ] Shimmer/skeleton loading en todas las listas
- [ ] Haptic feedback en acciones importantes
- [ ] Transiciones de página fluidas

### Tarea 10.2: Testing
- [ ] Widget tests para componentes críticos
- [ ] Integration tests para flujo login → chat → notificaciones

### Tarea 10.3: Build y Distribución
- [ ] Generar APK release firmado
- [ ] Generar IPA para TestFlight
- [ ] Verificar tamaño < 30 MB
