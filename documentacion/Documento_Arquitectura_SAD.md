# Documento de Arquitectura de Software (SAD)
## Sistema de Gestión Documental con Inteligencia Artificial (SGDIA)

**Metodología:** Proceso Unificado de Desarrollo de Software (PUDS) / RUP
**Enfoque Arquitectónico:** Vistas "4+1" de Kruchten

Este documento actúa como el índice central de la arquitectura del sistema SGDIA, referenciando las diferentes vistas arquitectónicas generadas conforme a la metodología PUDS.

## 1. Introducción
El SGDIA es una plataforma empresarial híbrida (Web/Móvil) diseñada para la gestión, almacenamiento, coedición y análisis predictivo de documentos. Integra un motor de inteligencia artificial (RAG + DL) y está construido sobre una arquitectura de microservicios orientada a eventos.

## 2. Representación Arquitectónica (Modelo 4+1)
La arquitectura se representa a través de 5 vistas principales, las cuales están documentadas en archivos separados con sus respectivos diagramas UML (renderizados con Mermaid):

*   **[Vista de Casos de Uso (Escenarios)](01_Vista_Casos_Uso.md):** Define el comportamiento del sistema desde la perspectiva de los actores (usuarios y sistemas externos). Es el motor que guía a las demás vistas.
*   **[Vista Lógica](02_Vista_Logica.md):** Describe la estructura estática del sistema en términos de paquetes, subsistemas y clases principales que soportan los casos de uso.
*   **[Vista de Procesos](03_Vista_Procesos.md):** Captura la concurrencia, paralelismo y el flujo dinámico del sistema (diagramas de secuencia y actividad para transacciones complejas).
*   **[Vista de Implementación (Componentes)](04_Vista_Implementacion.md):** Muestra la organización del código fuente, librerías, frameworks y componentes empaquetados (Frontend, Backend, Móvil, Workers).
*   **[Vista de Despliegue (Física)](05_Vista_Despliegue.md):** Detalla cómo se instalan y ejecutan los componentes de software en los nodos físicos/virtuales (Contenedores Docker, AWS, Base de datos).

## 3. Metas y Restricciones Arquitectónicas
*   **Disponibilidad:** Arquitectura cloud-ready (despliegue en contenedores).
*   **Escalabilidad:** Separación estricta entre el procesamiento pesado (Celery/ML) y la API REST síncrona.
*   **Rendimiento:** Caché en memoria con Redis y Búsqueda Vectorial nativa.
*   **Seguridad:** RBAC granular, JWT y auditoría inmutable de 2 años.

---
*Este documento ha sido generado siguiendo los lineamientos del Proceso Unificado para proveer a los desarrolladores, testers y stakeholders de una visión integral y rastreable.*
