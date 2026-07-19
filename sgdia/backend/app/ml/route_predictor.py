"""Route prediction for EASYDOC workflows.

The predictor first uses the local/offline training artifact generated from
March-July university data. If the artifact is missing, it falls back to a
deterministic heuristic table. Legacy business-document routes remain for
backward compatibility with existing tests and demos.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from app.core.database import get_database
from app.ml.local_training import load_artifact, predict_policy_route
from app.schemas.predictions import RoutePredictionResponse, RouteStep

logger = logging.getLogger(__name__)

_ROLE_ESTIMATES: dict[str, float] = {
    "Recepcion": 0.8,
    "Revision de requisitos": 1.35,
    "Validacion academica": 1.15,
    "Direccion de Carrera": 1.0,
    "Respuesta al estudiante": 0.45,
    "Archivo": 0.35,
    "Analisis": 2.5,
    "Revision Legal": 3.0,
    "Aprobacion": 1.5,
}

_DOC_TYPE_ROUTES: dict[str, list[str]] = {
    "casos_especiales": [
        "Recepcion",
        "Revision de requisitos",
        "Validacion academica",
        "Direccion de Carrera",
        "Respuesta al estudiante",
        "Archivo",
    ],
    "homologacion": [
        "Recepcion",
        "Revision documental",
        "Analisis de contenidos",
        "Comite Academico",
        "Resolucion",
        "Archivo",
    ],
    "certificado_notas": ["Recepcion", "Validacion de pagos", "Emision de certificado", "Entrega"],
    "retiro_materia": [
        "Recepcion",
        "Revision de calendario",
        "Validacion docente",
        "Registro",
        "Archivo",
    ],
    "beca_auxiliar": [
        "Recepcion",
        "Revision socioeconomica",
        "Validacion academica",
        "Comision de becas",
        "Publicacion de resultado",
        "Archivo",
    ],
    "contract": ["Recepción", "Análisis", "Revisión Legal", "Aprobación", "Archivo"],
    "policy": ["Recepción", "Análisis", "Aprobación", "Archivo"],
    "report": ["Recepción", "Análisis", "Archivo"],
    "invoice": ["Recepción", "Revisión Legal", "Aprobación", "Archivo"],
    "default": ["Recepcion", "Revision de requisitos", "Archivo"],
}

_POLICY_TO_DOC_TYPE = {
    "CE": "casos_especiales",
    "HN": "homologacion",
    "CN": "certificado_notas",
    "RT": "retiro_materia",
    "RB": "beca_auxiliar",
}


class RoutePredictor:
    """Predict the best route for a document or academic request."""

    async def predict(self, document_id: str) -> RoutePredictionResponse:
        db = get_database()
        doc = await db["documents"].find_one({"_id": document_id})
        artifact = load_artifact()
        policy_code = _infer_policy_code(doc)

        if policy_code and artifact:
            trained_route = predict_policy_route(policy_code, artifact)
            if trained_route:
                return _response_from_artifact(document_id, trained_route)

        doc_type = _infer_doc_type(doc, policy_code)
        route_names = _DOC_TYPE_ROUTES.get(doc_type, _DOC_TYPE_ROUTES["default"])
        return _response_from_heuristics(document_id, route_names)


def _infer_policy_code(doc: dict[str, Any] | None) -> str | None:
    if not doc:
        return None
    raw_policy = doc.get("policy_code") or doc.get("policyCode")
    if raw_policy:
        return str(raw_policy).upper()

    searchable = " ".join(
        str(value).lower()
        for value in (
            doc.get("filename", ""),
            doc.get("request_type", ""),
            " ".join(doc.get("tags", [])),
        )
    )
    if "casos" in searchable or "especial" in searchable:
        return "CE"
    if "homolog" in searchable:
        return "HN"
    if "certificado" in searchable or "notas" in searchable:
        return "CN"
    if "retiro" in searchable:
        return "RT"
    if "beca" in searchable:
        return "RB"
    return None


def _infer_doc_type(doc: dict[str, Any] | None, policy_code: str | None) -> str:
    if policy_code in _POLICY_TO_DOC_TYPE:
        return _POLICY_TO_DOC_TYPE[policy_code]
    if not doc:
        return "default"

    filename = str(doc.get("filename", "")).lower()
    tags = {str(tag).lower() for tag in doc.get("tags", [])}
    if "contract" in tags or filename.endswith(".docx"):
        return "contract"
    if "policy" in tags:
        return "policy"
    if "invoice" in tags:
        return "invoice"
    if "report" in tags:
        return "report"
    return "default"


def _response_from_artifact(
    document_id: str, trained_route: dict[str, Any]
) -> RoutePredictionResponse:
    steps: list[RouteStep] = []
    total_days = 0.0
    for stage in trained_route["route"]:
        estimate = float(stage["avg_days"])
        risk = float(stage["bottleneck_risk"])
        confidence = round(max(0.68, 0.96 - (risk * 0.18)), 2)
        steps.append(
            RouteStep(
                node_id=_node_id(stage["name"]),
                node_name=stage["name"],
                assigned_to=stage.get("common_worker"),
                estimated_days=estimate,
                confidence=confidence,
            )
        )
        total_days += estimate

    return RoutePredictionResponse(
        document_id=document_id,
        predicted_route=steps,
        total_estimated_days=round(total_days, 2),
        model_confidence=round(sum(step.confidence for step in steps) / len(steps), 2),
        generated_at=datetime.now(UTC),
    )


def _response_from_heuristics(document_id: str, route_names: list[str]) -> RoutePredictionResponse:
    steps: list[RouteStep] = []
    total_days = 0.0
    for name in route_names:
        base = _ROLE_ESTIMATES.get(name, 1.0)
        estimate = round(base, 2)
        confidence = 0.72
        steps.append(
            RouteStep(
                node_id=_node_id(name),
                node_name=name,
                assigned_to=None,
                estimated_days=estimate,
                confidence=confidence,
            )
        )
        total_days += estimate

    logger.info(
        "Route predicted for document %s: %d steps, %.1f days",
        document_id,
        len(steps),
        total_days,
    )

    return RoutePredictionResponse(
        document_id=document_id,
        predicted_route=steps,
        total_estimated_days=round(total_days, 2),
        model_confidence=round(sum(step.confidence for step in steps) / len(steps), 2),
        generated_at=datetime.now(UTC),
    )


def _node_id(name: str) -> str:
    return (
        name.lower()
        .replace(" ", "_")
        .replace("ó", "o")
        .replace("í", "i")
        .replace("á", "a")
        .replace("é", "e")
    )
