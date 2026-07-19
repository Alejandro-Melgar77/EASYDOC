# Vista de Casos de Uso (Modelo de Casos de Uso PUDS)

Esta vista describe la funcionalidad del sistema desde la perspectiva de sus actores. Abarca los 40 Casos de Uso (CU) definidos en los requisitos, agrupados por módulos.

## 1. Actores del Sistema
*   **Administrador:** Gestiona usuarios, roles, seguridad y métricas globales.
*   **Usuario Estándar:** Sube, edita, busca y colabora en documentos.
*   **Agente IA (Actor Sistema):** Procesa texto, asiste en chat y analiza datos.

## 2. Diagrama de Casos de Uso General (Nivel Subsistema)

```mermaid
usecaseDiagram
    actor Admin as "Administrador"
    actor User as "Usuario"
    actor AI as "Motor IA"

    package "Módulos SGDIA" {
        usecase UC_Auth as "1. Gestión y Auth (CU01-04)"
        usecase UC_Repo as "2. Repositorio (CU11-16)"
        usecase UC_Collab as "3. Edición Colaborativa (CU17-20)"
        usecase UC_UML as "4. Diagramador y Flujos (CU05-10)"
        usecase UC_IA as "5. Chat y Asistencia IA (CU21-26)"
        usecase UC_ML as "6. Predicción ML (CU27-31)"
        usecase UC_Rep as "7. Reportes Dinámicos (CU32-36)"
        usecase UC_Notif as "8. Auditoría y Notif (CU37-40)"
    }

    User --> UC_Auth
    User --> UC_Repo
    User --> UC_Collab
    User --> UC_UML
    User --> UC_IA
    User --> UC_Rep
    
    Admin --> UC_Auth
    Admin --> UC_Notif
    Admin --> UC_ML
    
    AI --> UC_IA
    AI --> UC_ML
    AI --> UC_Collab : "Sugiere contenido"
```

## 3. Detalle de Paquetes de Casos de Uso

### Paquete: Repositorio e IA
```mermaid
usecaseDiagram
    actor Usuario
    usecase U11 as "Subir Documento (CU-11)"
    usecase U12 as "Búsqueda Semántica (CU-12)"
    usecase U13 as "Control de Versiones (CU-13)"
    usecase U21 as "Chat con Documento (CU-21)"
    usecase U22 as "Extraer Texto OCR (CU-22)"

    Usuario --> U11
    Usuario --> U12
    Usuario --> U13
    Usuario --> U21
    
    U11 ..> U22 : <<include>>
    U21 ..> U12 : <<include>>
```

### Paquete: Colaboración y Diagramación
```mermaid
usecaseDiagram
    actor Usuario
    actor Colaborador
    
    usecase U17 as "Editar Simultáneamente (CU-17)"
    usecase U18 as "Ver Cursores y Avatares (CU-18)"
    usecase U05 as "Diseñar Diagrama UML (CU-05)"
    usecase U06 as "Exportar UML (CU-06)"
    
    Usuario --> U17
    Colaborador --> U17
    U17 ..> U18 : <<include>>
    
    Usuario --> U05
    U05 <.. U06 : <<extend>>
```

*Nota: La especificación textual de cada CU (flujo normal, alternativo, pre/post condiciones) está detallada en los documentos de requisitos y no se duplica en el diagrama arquitectónico de alto nivel.*
