"""Deterministic local corpus for EASYDOC's public procedure advisor."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.ml.demo_dataset import POLICIES

_SCENARIOS: dict[str, tuple[tuple[str, tuple[str, ...]], ...]] = {
    "CE": (
        (
            "Estoy retrasado en materias y necesito levantar un prerrequisito que aun no aprobe.",
            ("retrasado", "materias", "prerrequisito", "levantar"),
        ),
        (
            "Quiero cursar una materia aunque me falta aprobar una materia previa.",
            ("cursar", "materia", "previa", "requisito"),
        ),
        (
            "Tengo materias pendientes y necesito un caso especial para continuar.",
            ("materias", "pendientes", "caso", "especial"),
        ),
    ),
    "HN": (
        (
            "Vengo de otra universidad y quiero que reconozcan mis materias aprobadas.",
            ("otra", "universidad", "reconozcan", "materias"),
        ),
        (
            "Necesito homologar asignaturas cursadas en mi anterior carrera.",
            ("homologar", "asignaturas", "anterior", "carrera"),
        ),
        (
            "Quiero validar contenidos y notas de estudios externos.",
            ("validar", "contenidos", "notas", "externos"),
        ),
    ),
    "CN": (
        (
            "Necesito un certificado oficial de mis notas para una beca.",
            ("certificado", "notas", "oficial", "beca"),
        ),
        (
            "Donde solicito mi historial academico y las calificaciones?",
            ("historial", "academico", "calificaciones"),
        ),
        ("Quiero pedir copias de mi certificado de notas.", ("copias", "certificado", "notas")),
    ),
    "RT": (
        ("Quiero retirar una materia este semestre.", ("retirar", "materia", "semestre")),
        (
            "Necesito dar de baja una asignatura por un motivo personal.",
            ("baja", "asignatura", "motivo"),
        ),
        ("Todavia puedo cancelar una materia inscrita?", ("cancelar", "materia", "inscrita")),
    ),
    "RB": (
        ("Quiero postular a una beca auxiliar de la carrera.", ("postular", "beca", "auxiliar")),
        (
            "Necesito apoyo economico y quiero ser auxiliar universitario.",
            ("apoyo", "economico", "auxiliar"),
        ),
        (
            "Como presento mi declaracion para una beca academica?",
            ("declaracion", "beca", "academica"),
        ),
    ),
    "RE": (
        (
            "No pude rendir mi examen por una emergencia y necesito otra fecha.",
            ("examen", "emergencia", "otra", "fecha"),
        ),
        (
            "Quiero reprogramar una evaluacion porque presente un certificado medico.",
            ("reprogramar", "evaluacion", "certificado", "medico"),
        ),
        ("Como solicito una nueva fecha para mi parcial?", ("nueva", "fecha", "parcial")),
    ),
    "CG": (
        (
            "Necesito cambiarme de grupo en una materia por cruce de horarios.",
            ("cambiar", "grupo", "materia", "horarios"),
        ),
        ("Hay cupo en otro paralelo de mi asignatura?", ("cupo", "paralelo", "asignatura")),
        (
            "Quiero pasar del grupo A al grupo B de una materia inscrita.",
            ("grupo", "materia", "inscrita"),
        ),
    ),
    "TI": (
        (
            "Estoy por egresar y quiero iniciar mi proceso de titulacion.",
            ("egresar", "proceso", "titulacion"),
        ),
        (
            "Necesito presentar mis documentos para defensa de grado.",
            ("documentos", "defensa", "grado"),
        ),
        (
            "Quiero solicitar tribunal o modalidad para obtener mi titulo.",
            ("tribunal", "modalidad", "titulo"),
        ),
    ),
    "HI": (
        ("Quiero consultar mi historico completo de notas.", ("historico", "notas", "completo")),
        (
            "Necesito mis calificaciones de gestiones anteriores.",
            ("calificaciones", "gestiones", "anteriores"),
        ),
        ("Donde pido el registro de todas mis notas?", ("registro", "notas")),
    ),
    "RD": (
        ("Quiero presentar un reclamo formal sobre un docente.", ("reclamo", "formal", "docente")),
        (
            "Necesito informar un problema con la evaluacion de mi profesor.",
            ("problema", "evaluacion", "profesor"),
        ),
        (
            "Como presento evidencia por un conflicto con un docente?",
            ("evidencia", "conflicto", "docente"),
        ),
    ),
}
_MESSAGE_FRAMES = (
    "{message}",
    "Soy estudiante y necesito orientacion: {message}",
    "Antes de presentar mi solicitud, necesito saber esto: {message}",
)


def build_agentic_cases() -> dict[str, Any]:
    """Generate explainable guest-advisor examples for the March-July corpus."""
    cases: list[dict[str, Any]] = []
    for policy in POLICIES:
        for index, (message, keywords) in enumerate(_SCENARIOS[policy.code], start=1):
            for frame_index, frame in enumerate(_MESSAGE_FRAMES, start=1):
                cases.append(
                    {
                        "id": f"agent-{policy.code.lower()}-{index:02d}-{frame_index}",
                        "policy_code": policy.code,
                        "policy_name": policy.name,
                        "student_message": frame.format(message=message),
                        "keywords": list(keywords),
                        "expected_action": "recommend_policy",
                        "next_step": "open_dynamic_form",
                        "agent_plan": [
                            "classify_intent",
                            "recommend_published_policy",
                            "present_requirements",
                            "open_dynamic_form",
                        ],
                        "requirements": list(policy.requirements),
                        "is_synthetic": True,
                    }
                )
    return {
        "product": "EASYDOC",
        "corpus_type": "local_agentic_policy_guidance",
        "generated_at": datetime.now(UTC).isoformat(),
        "period": {"from": "2026-03-01", "to": "2026-07-31"},
        "is_synthetic": True,
        "cases": cases,
    }
