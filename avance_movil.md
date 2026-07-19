# 📊 Avance — Agente Móvil

> **Instrucciones**: Este documento es el registro de progreso del Agente Móvil (Flutter).
> Antes de iniciar cualquier tarea, leer este archivo para saber dónde se dejó el trabajo.
> Al completar cada tarea, agregar una entrada con el formato indicado abajo.

## Estado General

| Métrica | Valor |
|---|---|
| **Fase actual** | FASE 4.5 - MVP de tramites y seguimiento completado |
| **Tareas completadas** | 16 / 24 |
| **Última actualización** | 2026-07-19 |
| **Bloqueantes** | FCM requiere credenciales Firebase institucionales. |

---

## Registro de Avance

### 2026-06-09 00:48 — FASE 0: Inicialización del Proyecto Flutter
- **Estado**: ✅ Completada
- **Archivos creados/modificados**:
  - Proyecto flutter base en `sgdia/mobile/sgdia_mobile`
  - `pubspec.yaml` (añadidas dependencias y dev_dependencies)
  - `lib/core/config/environment.dart`
  - `lib/core/network/api_client.dart`, `websocket_client.dart`
  - `lib/core/storage/secure_storage.dart`
  - `lib/core/router/app_router.dart`
  - `lib/core/theme/app_theme.dart`, `colors.dart`, `typography.dart`
  - `lib/core/models/user.dart`, `document.dart`, `notification.dart`, `conversation.dart`
  - `lib/shared/widgets/custom_button.dart`
- **Screens implementados**: Ninguno (Solo arquitectura base)
- **Notas**: Inicialización de arquitectura y diseño lista. Al correr pub add en Windows con ciertos plugins nativos puede requerir activar el modo de desarrollador para symlinks si se desea buildear en Windows local. Modelos creados esperando código generado con build_runner.
- **Siguiente tarea**: Tarea 1.1: Pantalla de Login — CU-02

### 2026-06-09 07:41 — FASE 1: Autenticación (CU-01 a CU-04)
- **Estado**: ✅ Completada
- **Archivos creados/modificados**:
  - `lib/core/utils/jwt_helper.dart` (decodificación de tokens y control de expiración)
  - `lib/core/utils/biometric_helper.dart` (enlace con local_auth para biometría)
  - `lib/core/storage/secure_storage.dart` (modificado para soportar token de refresco)
  - `lib/core/network/api_client.dart` (modificado con auto-refresh proactivo de token)
  - `lib/features/auth/data/auth_repository.dart` (login, logout, obtención de perfil y chequeo de sesión)
  - `lib/features/auth/providers/auth_provider.dart` (gestión de estado de autenticación con Riverpod)
  - `lib/features/auth/presentation/login_screen.dart` (pantalla de login con validación, biometría y bloqueo visual tras 5 intentos fallidos)
  - `lib/features/auth/presentation/splash_screen.dart` (pantalla de carga animada que redirige según estado)
  - `lib/features/dashboard/presentation/dashboard_screen.dart` (pantalla de bienvenida básica con drawer y opción de cierre de sesión)
  - `lib/core/router/app_router.dart` (configurado con GoRoute, guards y redirecciones)
- **Screens implementados**:
  - `SplashScreen` (Carga animada y enrutador)
  - `LoginScreen` (Formulario, animaciones, botón biométrico y bloqueo temporal)
  - `DashboardScreen` (Home básico, datos de usuario, y menú Drawer para logout)
- **Notas**: Integrado con la lógica del backend (`auth.py` y `auth_service.py`). Se obtiene el payload JWT, se extrae el ID de usuario (`sub`) y se consume `/users/{user_id}` para poblar el objeto `User` globalmente. El bloqueo visual de 5 intentos bloquea la interfaz local durante 30 segundos, simulando la seguridad del rate limiting.
- **Siguiente tarea**: FASE 2 — Repositorio Documental: CU-11, CU-12, CU-15 (Día 5-8)

### 2026-07-19 - FASE 4.5: MVP movil de invitados y funcionarios
- **Estado**: Completada y validada con analizador Dart.
- **Alcance**: Catalogo publico de tramites, formulario dinamico, adjuntos, recibo con codigo/PIN,
  seguimiento, inicio de sesion y lista de tareas de funcionario. El telefono no incorpora el
  diagramador UML ni el repositorio administrativo completo.
- **Contrato actualizado**: El seguimiento consume etapas paralelas, cierre total y respuesta final
  publicados por la API. La pantalla movil muestra la respuesta institucional y el estado de
  aprobacion cuando corresponde.
- **Calidad**: `flutter analyze --no-pub`, `dart format --set-exit-if-changed lib` y `flutter test
  --no-pub` aprobados.
- **Siguiente tarea**: Configurar Firebase/FCM real, pruebas en dispositivo y aceptacion movil.

<!-- Formato para cada entrada:
### [FECHA] [HORA] — Tarea X.X: [Nombre]
- **Estado**: ✅ Completada | 🔄 En progreso | ❌ Bloqueada
- **Archivos creados/modificados**: lista de archivos
- **Screens implementados**: lista de screens
- **Notas**: observaciones, decisiones tomadas, problemas encontrados
- **Siguiente tarea**: indicar cuál sigue
-->
