# 📖 Manual de Usuario y Guía de Pruebas Locales (SGDIA)

Este documento detalla los pasos exactos para configurar, ejecutar y probar el **Sistema de Gestión Documental con Inteligencia Artificial (SGDIA)** en un entorno local.

---

## 🛠️ 1. Requisitos Previos (Prerrequisitos)

Para ejecutar todos los componentes del sistema en tu máquina, necesitas tener instalados los siguientes programas:

1. **Docker y Docker Compose**: Fundamental para levantar las bases de datos y servicios de infraestructura (MongoDB, Redis, MinIO, RabbitMQ). [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. **Python 3.10 o superior**: Para el servidor Backend (FastAPI). [Descargar Python](https://www.python.org/downloads/).
3. **Node.js (v24 LTS recomendada)**: Para ejecutar el Frontend web. [Descargar Node.js](https://nodejs.org/).
4. **Angular CLI**: Se instala globalmente ejecutando en la terminal: `npm install -g @angular/cli`.
5. **Flutter SDK**: Para ejecutar la aplicación móvil nativa. [Guía de instalación de Flutter](https://docs.flutter.dev/get-started/install).

---

## 🚀 2. Ejecución del Entorno Local

Sigue el orden estricto de ejecución para evitar errores de conexión:

### Paso 2.1: Levantar la Infraestructura (Base de Datos, Caché, Storage)
El backend requiere varios servicios que están dockerizados.
1. Abre una terminal en la raíz del proyecto.
2. Ejecuta el archivo de contenedores (si existe `docker-compose.yml` en la raíz o en backend):
   ```bash
   docker-compose up -d
   ```
   *(Esto iniciará MongoDB, Redis y otros servicios definidos en el plan de infraestructura en segundo plano).*

### Paso 2.2: Ejecutar el Backend (Python / FastAPI)
1. Abre una terminal y navega a la carpeta del backend (asumiendo `sgdia/backend` o donde esté `requirements.txt`).
2. Crea y activa un entorno virtual:
   - **Windows:**
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Ejecuta el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --reload
   ```
   *El backend estará disponible en: **http://localhost:8000***
   *Puedes ver y probar la API directamente en **http://localhost:8000/docs** (Swagger UI).*

### Paso 2.3: Ejecutar el Frontend (Angular)
1. Abre otra terminal y navega a la carpeta del frontend:
   ```bash
   cd sgdia/frontend
   ```
2. Instala los paquetes de Node:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo web:
   ```bash
   ng serve
   ```
   *La web app estará disponible en: **http://localhost:4200***

### Paso 2.4: Ejecutar la App Móvil (Flutter)
1. Abre otra terminal y navega a la carpeta móvil:
   ```bash
   cd sgdia/mobile/sgdia_mobile
   ```
2. Descarga las dependencias de Flutter:
   ```bash
   flutter pub get
   ```
3. Ejecuta la aplicación (asegúrate de tener un emulador Android/iOS abierto o un celular conectado, o elige Windows si está habilitado):
   ```bash
   flutter run
   ```

---

## 🧪 3. Guía de Pruebas de Funcionalidades

Una vez que tengas el Backend y el Frontend/Móvil corriendo, puedes probar las siguientes funcionalidades ya implementadas:

### A. Autenticación y Seguridad
- **Dónde probar:** Frontend (`http://localhost:4200`) y Móvil.
- **Acción:** Ingresa a la pantalla de Login. Usa credenciales de prueba. El sistema generará un token JWT, validar roles, y en la app móvil podrás ver simulaciones biométricas y bloqueo temporal por intentos fallidos.

### B. Explorador y Repositorio Documental
- **Dónde probar:** Frontend (Panel de Dashboard -> Repositorio).
- **Acción:** Explora el árbol de carpetas. Prueba el modal de "Carga de Documentos" animado (Drag & Drop). Prueba abrir la vista previa (Preview) de un archivo o explorar su línea de tiempo (Versiones).

### C. Editor Colaborativo (ONLYOFFICE Simulado)
- **Dónde probar:** Frontend.
- **Acción:** Selecciona un archivo en el explorador y entra al Editor. Podrás ver simulaciones de cursores remotos, autoguardado en tiempo real, un panel de comentarios anidados (hilos) y la opción de resolver comentarios.

### D. Diagramador UML
- **Dónde probar:** Frontend.
- **Acción:** Entra al módulo de flujos de trabajo/UML. Tendrás un lienzo nativo infinito de Angular CDK. Podrás arrastrar y soltar elementos (Drag & Drop), ver el panel de propiedades lateral, y exportar tus diagramas.

### E. Agente de IA (Chat y Analítica)
- **Dónde probar:** Frontend (Módulo de Agente IA).
- **Acción:** Interactúa con el chat de IA. Renderizará respuestas en Markdown simulando RAG y streaming de modelos. Prueba el modal de "Entrada de Voz" que simula grabación de audio y traducción a texto. 
- En el **Dashboard de Predicciones**, podrás observar gráficos estadísticos impulsados por Chart.js que muestran predicciones de rendimiento y dispersión de anomalías.

### F. Generación de Reportes
- **Dónde probar:** Frontend.
- **Acción:** Utiliza el "Report Builder" (Stepper Wizard interactivo) para armar un reporte seleccionando plantillas, o utiliza el dictado por voz para autocompletar parámetros del reporte simulando IA.
