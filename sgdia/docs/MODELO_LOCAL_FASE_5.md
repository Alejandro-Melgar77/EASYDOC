# Modelo local Fase 5

Actualizado: 19 de julio de 2026

## Proposito

Esta iteracion entrega una linea base local y offline para orientar tramites, estimar rutas y
visualizar riesgos. No toma decisiones administrativas ni reemplaza la revision humana.

## Componentes

- Orientador publico: compara la consulta con `easydoc_agentic_cases.json` y las politicas publicadas.
- Corpus agentico: 45 casos sinteticos para Casos Especiales, Homologacion de Materias,
  Certificado de Notas, Retiro de Materia y Beca Auxiliar.
- Modelo de rutas y riesgo: `easydoc_local_route_risk_v1`, tipo `offline_statistical_baseline`.
- Recuperacion semantica: `local_hashing_tfidf_v1`, vector local y determinista de 256 dimensiones.
  Reemplaza embeddings nulos y no llama a APIs externas.
- RAG local: recupera documentos activos locales y responde solo con la evidencia recuperada; cuando
  no existe evidencia suficiente, solicita revision o escalamiento.
- Extraccion documental: procesa TXT, DOCX, XLSX, imagen y PDF escaneado de forma local. Devuelve
  el motor usado, paginas procesadas, estado de extraccion y marca de revision humana.
- Gobierno de entrenamiento: `easydoc_training_governance_v1` bloquea toda automatizacion hasta
  reunir al menos 200 flujos reales anonimizados y aprobados para revision humana.

## Datos y evaluacion

| Dato | Valor |
| --- | --- |
| Origen | Sintetico, identificado como tal |
| Rango de entrenamiento | 1 de marzo al 30 de junio de 2026 |
| Rango de validacion | 1 al 31 de julio de 2026 |
| Muestras de entrenamiento | 556 |
| Muestras de validacion | 231 |
| Flujos del artefacto | 787 |
| Coincidencia de rutas | 1.000 |
| MAE de duracion | 0.587 dias |
| Coincidencia de guia semantica | 1.000 sobre corpus sintetico |
| Flujos reales requeridos para revision | 200 |

La coincidencia de rutas mide el acuerdo con rutas creadas por la misma semilla. Por ello no es una
medida de desempeno institucional ni una garantia para tramites reales.

## Trazabilidad

- Casos agenticos: `backend/app/ml/training_data/easydoc_agentic_cases.json`
- Artefacto de rutas: `backend/app/ml/artifacts/easydoc_route_model.json`
- Reporte de evaluacion: `backend/app/ml/artifacts/easydoc_training_report.json`
- Gobierno de entrenamiento: `backend/app/ml/artifacts/easydoc_training_readiness.json`
- Generador repetible: `backend/scripts/generate_phase5_assets.py`
- Seed idempotente: `backend/scripts/seed_easydoc_demo.py`

## Reglas de uso

1. La interfaz expone el origen sintetico del modelo.
2. Las sugerencias de carga son informativas; ninguna reasignacion se ejecuta automaticamente.
3. Los adjuntos permanecen en la infraestructura local; no se llaman servicios externos de IA.
4. Antes de activar decisiones operativas se requieren datos anonimizados reales, aprobacion humana,
   pruebas de sesgo y monitoreo de deriva.
5. La dependencia `PyMuPDF` se instala desde `requirements-local-ai.txt` en la imagen Docker y el
   OCR PDF escaneado fue verificado despues de recrear el backend.
