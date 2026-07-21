"""Synthetic EASYDOC data for local/offline ML training.

The generator models a university career office from March to July 2026:
business policies, dynamic forms, workflow events, users and worker document
repositories. It is deterministic so demos and tests can reproduce the same
training artifact.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

START_DATE = datetime(2026, 3, 1, tzinfo=UTC)
END_DATE = datetime(2026, 7, 31, 23, 59, tzinfo=UTC)

DEPARTMENTS: tuple[str, ...] = (
    "Recepcion y Ventanilla",
    "Secretaria Academica",
    "Coordinacion Academica",
    "Unidad Docente",
    "Direccion de Carrera",
    "Archivo Academico",
    "Titulacion",
    "Bienestar Estudiantil",
)

STAGE_DEPARTMENTS = {
    "Recepcion": "Recepcion y Ventanilla",
    "Revision de requisitos": "Secretaria Academica",
    "Revision documental": "Secretaria Academica",
    "Revision de calendario": "Secretaria Academica",
    "Validacion academica": "Coordinacion Academica",
    "Validacion docente": "Unidad Docente",
    "Analisis de contenidos": "Unidad Docente",
    "Consulta de cupos": "Coordinacion Academica",
    "Registro academico": "Secretaria Academica",
    "Validacion de pagos": "Secretaria Academica",
    "Emision de certificado": "Archivo Academico",
    "Entrega": "Recepcion y Ventanilla",
    "Archivo": "Archivo Academico",
    "Direccion de Carrera": "Direccion de Carrera",
    "Resolucion": "Direccion de Carrera",
    "Comite Academico": "Direccion de Carrera",
    "Comision de becas": "Bienestar Estudiantil",
    "Revision socioeconomica": "Bienestar Estudiantil",
    "Publicacion de resultado": "Bienestar Estudiantil",
    "Solicitud de tribunal": "Titulacion",
    "Revision de expediente": "Titulacion",
    "Defensa o modalidad": "Titulacion",
    "Emision de titulo": "Titulacion",
    "Consulta historico": "Archivo Academico",
    "Recepcion de reclamo": "Recepcion y Ventanilla",
    "Descargo docente": "Unidad Docente",
    "Mediacion academica": "Coordinacion Academica",
    "Respuesta al estudiante": "Recepcion y Ventanilla",
    "Reprogramacion": "Coordinacion Academica",
}


@dataclass(frozen=True)
class PolicyTemplate:
    code: str
    name: str
    department: str
    expected_days: float
    route: tuple[str, ...]
    form: tuple[str, ...]
    requirements: tuple[str, ...]
    monthly_volume: tuple[int, int, int, int, int]


POLICIES: tuple[PolicyTemplate, ...] = (
    PolicyTemplate(
        code="CE",
        name="Casos Especiales",
        department="Secretaria Academica",
        expected_days=4.0,
        route=(
            "Recepcion",
            "Revision de requisitos",
            "Validacion academica",
            "Direccion de Carrera",
            "Respuesta al estudiante",
            "Archivo",
        ),
        form=("codigo_estudiante", "materias_retrasadas", "justificacion", "periodo"),
        requirements=(
            "registro_universitario.pdf",
            "carta_solicitud.docx",
            "documento_identidad.jpg",
        ),
        monthly_volume=(28, 35, 41, 52, 67),
    ),
    PolicyTemplate(
        code="HN",
        name="Homologacion de Materias",
        department="Coordinacion Academica",
        expected_days=6.0,
        route=(
            "Recepcion",
            "Revision documental",
            "Analisis de contenidos",
            "Comite Academico",
            "Resolucion",
            "Archivo",
        ),
        form=("universidad_origen", "materias_aprobadas", "programa_destino", "periodo"),
        requirements=("certificado_notas.pdf", "programas_analiticos.pdf", "carta_solicitud.docx"),
        monthly_volume=(14, 17, 21, 29, 33),
    ),
    PolicyTemplate(
        code="CN",
        name="Certificado de Notas",
        department="Archivo Academico",
        expected_days=2.0,
        route=("Recepcion", "Validacion de pagos", "Emision de certificado", "Entrega"),
        form=("codigo_estudiante", "periodo", "cantidad_copias"),
        requirements=("documento_identidad.jpg", "comprobante_pago.pdf"),
        monthly_volume=(32, 38, 43, 58, 74),
    ),
    PolicyTemplate(
        code="RT",
        name="Retiro de Materia",
        department="Secretaria Academica",
        expected_days=3.0,
        route=("Recepcion", "Revision de calendario", "Validacion docente", "Registro", "Archivo"),
        form=("codigo_estudiante", "materia", "motivo", "periodo"),
        requirements=("formulario_retiro.docx", "documento_identidad.jpg"),
        monthly_volume=(21, 25, 19, 15, 12),
    ),
    PolicyTemplate(
        code="RB",
        name="Solicitud de Beca Auxiliar",
        department="Bienestar Estudiantil",
        expected_days=7.0,
        route=(
            "Recepcion",
            "Revision socioeconomica",
            "Validacion academica",
            "Comision de becas",
            "Publicacion de resultado",
            "Archivo",
        ),
        form=("codigo_estudiante", "promedio", "ingreso_familiar", "horas_disponibles"),
        requirements=(
            "registro_universitario.pdf",
            "declaracion_jurada.pdf",
            "documento_identidad.jpg",
        ),
        monthly_volume=(9, 11, 17, 31, 45),
    ),
    PolicyTemplate(
        code="RE",
        name="Reprogramacion de Examenes",
        department="Coordinacion Academica",
        expected_days=3.0,
        route=(
            "Recepcion",
            "Revision de requisitos",
            "Validacion docente",
            "Reprogramacion",
            "Respuesta al estudiante",
            "Archivo",
        ),
        form=("codigo_estudiante", "materia", "fecha_examen", "motivo"),
        requirements=("documento_identidad.jpg", "respaldo_medico.pdf"),
        monthly_volume=(16, 20, 26, 33, 39),
    ),
    PolicyTemplate(
        code="CG",
        name="Solicitud de Cambio de Grupo de Materia",
        department="Secretaria Academica",
        expected_days=2.0,
        route=(
            "Recepcion",
            "Revision de requisitos",
            "Consulta de cupos",
            "Registro academico",
            "Respuesta al estudiante",
            "Archivo",
        ),
        form=("codigo_estudiante", "materia", "grupo_actual", "grupo_solicitado", "motivo"),
        requirements=("documento_identidad.jpg", "horario_actual.pdf"),
        monthly_volume=(24, 31, 37, 43, 50),
    ),
    PolicyTemplate(
        code="TI",
        name="Titulacion",
        department="Titulacion",
        expected_days=15.0,
        route=(
            "Recepcion",
            "Revision de expediente",
            "Validacion academica",
            "Solicitud de tribunal",
            "Defensa o modalidad",
            "Emision de titulo",
            "Archivo",
        ),
        form=("codigo_estudiante", "modalidad", "tema", "tutor"),
        requirements=(
            "certificado_notas.pdf",
            "solvencia_academica.pdf",
            "documento_identidad.jpg",
        ),
        monthly_volume=(5, 7, 9, 12, 18),
    ),
    PolicyTemplate(
        code="HI",
        name="Consulta de Historico de Notas",
        department="Archivo Academico",
        expected_days=1.0,
        route=("Recepcion", "Consulta historico", "Emision de certificado", "Entrega", "Archivo"),
        form=("codigo_estudiante", "periodo_desde", "periodo_hasta"),
        requirements=("documento_identidad.jpg",),
        monthly_volume=(26, 32, 41, 49, 61),
    ),
    PolicyTemplate(
        code="RD",
        name="Reclamo de Docente",
        department="Coordinacion Academica",
        expected_days=8.0,
        route=(
            "Recepcion de reclamo",
            "Revision de requisitos",
            "Descargo docente",
            "Mediacion academica",
            "Direccion de Carrera",
            "Respuesta al estudiante",
            "Archivo",
        ),
        form=("codigo_estudiante", "docente", "materia", "descripcion_hechos"),
        requirements=("documento_identidad.jpg", "respaldo_reclamo.pdf"),
        monthly_volume=(4, 6, 8, 11, 14),
    ),
)


WORKERS = (
    {
        "id": "usr_dir_001",
        "name": "Dra. Camila Ferrufino",
        "role": "director",
        "department": "Direccion de Carrera",
    },
    {
        "id": "usr_sec_001",
        "name": "Sofia Vargas",
        "role": "secretary",
        "department": "Secretaria Academica",
    },
    {
        "id": "usr_sec_002",
        "name": "Rodrigo Lima",
        "role": "secretary",
        "department": "Secretaria Academica",
    },
    {
        "id": "usr_fun_001",
        "name": "Mariana Roca",
        "role": "official",
        "department": "Archivo Academico",
    },
    {
        "id": "usr_fun_002",
        "name": "Esteban Quiroga",
        "role": "official",
        "department": "Coordinacion Academica",
    },
    {
        "id": "usr_bie_001",
        "name": "Paola Andrade",
        "role": "worker",
        "department": "Bienestar Estudiantil",
    },
    {
        "id": "usr_rec_001",
        "name": "Diego Molina",
        "role": "worker",
        "department": "Recepcion y Ventanilla",
    },
    {
        "id": "usr_rec_002",
        "name": "Elena Flores",
        "role": "worker",
        "department": "Recepcion y Ventanilla",
    },
    {
        "id": "usr_coord_002",
        "name": "Andrea Pardo",
        "role": "coordinator",
        "department": "Coordinacion Academica",
    },
    {
        "id": "usr_doc_001",
        "name": "Martin Cespedes",
        "role": "official",
        "department": "Unidad Docente",
    },
    {
        "id": "usr_doc_002",
        "name": "Lucia Soria",
        "role": "official",
        "department": "Unidad Docente",
    },
    {
        "id": "usr_dir_002",
        "name": "Jorge Velasco",
        "role": "manager",
        "department": "Direccion de Carrera",
    },
    {
        "id": "usr_arc_002",
        "name": "Nora Quispe",
        "role": "official",
        "department": "Archivo Academico",
    },
    {
        "id": "usr_tit_001",
        "name": "Ramon Alarcon",
        "role": "coordinator",
        "department": "Titulacion",
    },
    {
        "id": "usr_tit_002",
        "name": "Gabriela Lema",
        "role": "official",
        "department": "Titulacion",
    },
    {
        "id": "usr_bie_002",
        "name": "Marta Colque",
        "role": "worker",
        "department": "Bienestar Estudiantil",
    },
)

STUDENT_NAMES = (
    "Luis Mendoza",
    "Valeria Rojas",
    "Diego Paredes",
    "Mariela Choque",
    "Kevin Salazar",
    "Natalia Arce",
    "Bruno Aguilar",
    "Fernanda Soliz",
    "Paulo Rivero",
    "Carla Tapia",
)

STATUSES = ("recibido", "en_curso", "observado", "aprobado", "rechazado", "terminado", "desechado")


def build_demo_dataset(seed: int = 20260718) -> dict[str, Any]:
    """Return a deterministic EASYDOC training dataset."""

    rng = random.Random(seed)
    users = _build_users()
    policies = [_policy_to_dict(policy) for policy in POLICIES]
    forms = [_form_to_dict(policy) for policy in POLICIES]
    workflows: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    repositories: dict[str, dict[str, list[dict[str, Any]]]] = {}

    months = [3, 4, 5, 6, 7]
    sequence = 1
    for policy in POLICIES:
        for month_index, month in enumerate(months):
            volume = policy.monthly_volume[month_index]
            for item_index in range(volume):
                created = _date_in_month(rng, 2026, month)
                workflow, workflow_events = _build_workflow(
                    policy, sequence, item_index, created, rng
                )
                workflows.append(workflow)
                events.extend(workflow_events)
                _register_repository_files(repositories, workflow, workflow_events, policy)
                sequence += 1

    training_examples = [_workflow_to_training_example(item) for item in workflows]
    return {
        "product": "EASYDOC",
        "institution": "Direccion de Carrera - Universidad Demo",
        "period": {"from": START_DATE.isoformat(), "to": END_DATE.isoformat()},
        "generated_at": datetime.now(UTC).isoformat(),
        "users": users,
        "business_policies": policies,
        "dynamic_forms": forms,
        "workflow_instances": workflows,
        "workflow_events": events,
        "document_repositories": repositories,
        "training_examples": training_examples,
    }


def _build_users() -> list[dict[str, Any]]:
    students = [
        {
            "id": f"stu_{index:03d}",
            "name": name,
            "email": f"estudiante{index:03d}@universidad.demo",
            "role": "client_student",
            "login_required": False,
            "department": "Invitados",
        }
        for index, name in enumerate(STUDENT_NAMES, start=1)
    ]
    staff = [
        {
            **worker,
            "email": _staff_email(worker["name"]),
            "login_required": True,
        }
        for worker in WORKERS
    ]
    return staff + students


def _staff_email(name: str) -> str:
    parts = [part.strip(".").lower() for part in name.split() if part.strip(".").lower() != "dra"]
    return f"{parts[0]}.{parts[-1]}@easydoc.edu"


def _policy_to_dict(policy: PolicyTemplate) -> dict[str, Any]:
    return {
        "code": policy.code,
        "name": policy.name,
        "owner_department": policy.department,
        "uml_version": "2.5+",
        "expected_days": policy.expected_days,
        "route": list(policy.route),
        "status": "publicada",
    }


def _form_to_dict(policy: PolicyTemplate) -> dict[str, Any]:
    return {
        "id": f"form_{policy.code.lower()}",
        "policy_code": policy.code,
        "name": f"Formulario {policy.name}",
        "fields": [
            {"key": field, "label": field.replace("_", " ").title(), "required": True}
            for field in policy.form
        ],
        "requirements": list(policy.requirements),
    }


def _date_in_month(rng: random.Random, year: int, month: int) -> datetime:
    day = rng.randint(1, 28)
    hour = rng.randint(8, 17)
    minute = rng.choice((0, 15, 30, 45))
    return datetime(year, month, day, hour, minute, tzinfo=UTC)


def _build_workflow(
    policy: PolicyTemplate,
    sequence: int,
    item_index: int,
    created: datetime,
    rng: random.Random,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    student = STUDENT_NAMES[item_index % len(STUDENT_NAMES)]
    overload_factor = 1.0
    if policy.code in {"CE", "RB"} and created.month in {6, 7}:
        overload_factor = rng.uniform(1.25, 1.75)
    elif created.weekday() == 0:
        overload_factor = rng.uniform(1.05, 1.25)

    events: list[dict[str, Any]] = []
    current = created
    total_days = 0.0
    has_anomaly = False
    final_status = "terminado"

    for step_index, stage in enumerate(policy.route):
        worker = _worker_for_stage(stage, policy.department)
        stage_days = round(rng.uniform(0.25, 1.25) * overload_factor, 2)
        if stage in {"Revision de requisitos", "Revision socioeconomica"} and rng.random() < 0.18:
            stage_days += rng.uniform(1.0, 2.4)
            has_anomaly = True

        status = "en_curso"
        if step_index == 0:
            status = "recibido"
        elif step_index == len(policy.route) - 1:
            status = final_status
        elif has_anomaly and rng.random() < 0.12:
            status = "observado"

        event_started = current
        current = current + timedelta(days=stage_days)
        total_days += stage_days
        events.append(
            {
                "workflow_id": f"wf_{sequence:04d}",
                "policy_code": policy.code,
                "stage": stage,
                "department": worker["department"],
                "worker_id": worker["id"],
                "worker_name": worker["name"],
                "status": status,
                "started_at": event_started.isoformat(),
                "finished_at": current.isoformat(),
                "duration_days": round(stage_days, 2),
            }
        )

    if rng.random() < 0.04:
        final_status = "rechazado"
    elif rng.random() < 0.02:
        final_status = "desechado"

    priority = _priority(policy.code, created, has_anomaly)
    return (
        {
            "id": f"wf_{sequence:04d}",
            "request_code": f"{policy.code}-2026-{sequence:04d}",
            "policy_code": policy.code,
            "policy_name": policy.name,
            "student_name": student,
            "created_at": created.isoformat(),
            "completed_at": current.isoformat(),
            "status": final_status,
            "priority": priority,
            "expected_days": policy.expected_days,
            "actual_days": round(total_days, 2),
            "is_overdue": total_days > policy.expected_days,
            "has_anomaly": has_anomaly,
            "requirements": list(policy.requirements),
        },
        events,
    )


def _worker_for_stage(stage: str, fallback_department: str) -> dict[str, str]:
    department = STAGE_DEPARTMENTS.get(stage, fallback_department)
    candidates = [worker for worker in WORKERS if worker["department"] == department]
    if not candidates:
        candidates = [worker for worker in WORKERS if worker["department"] == fallback_department]
    return candidates[sum(ord(char) for char in stage) % len(candidates)]


def _priority(policy_code: str, created: datetime, has_anomaly: bool) -> str:
    if has_anomaly or (policy_code in {"CE", "RB"} and created.month == 7):
        return "alta"
    if policy_code in {"HN", "RT"}:
        return "media"
    return "normal"


def _register_repository_files(
    repositories: dict[str, dict[str, list[dict[str, Any]]]],
    workflow: dict[str, Any],
    events: list[dict[str, Any]],
    policy: PolicyTemplate,
) -> None:
    first_event = next(event for event in events if event["workflow_id"] == workflow["id"])
    reception_repo = repositories.setdefault(first_event["department"], {}).setdefault(
        first_event["worker_name"],
        [],
    )
    for requirement in policy.requirements:
        reception_repo.append(
            {
                "workflow_id": workflow["id"],
                "request_code": workflow["request_code"],
                "filename": f"{workflow['request_code']}_{requirement}",
                "uploaded_by": workflow["student_name"],
                "stored_at": first_event["started_at"],
                "status": workflow["status"],
            }
        )

    for event in events:
        if event["workflow_id"] != workflow["id"]:
            continue
        department_repo = repositories.setdefault(event["department"], {})
        worker_repo = department_repo.setdefault(event["worker_name"], [])
        worker_repo.append(
            {
                "workflow_id": workflow["id"],
                "request_code": workflow["request_code"],
                "filename": (
                    f"{workflow['request_code']}_"
                    f"{event['stage'].lower().replace(' ', '_')}_acta.docx"
                ),
                "uploaded_by": event["worker_name"],
                "stored_at": event["finished_at"],
                "status": event["status"],
            }
        )


def _workflow_to_training_example(workflow: dict[str, Any]) -> dict[str, Any]:
    return {
        "workflow_id": workflow["id"],
        "policy_code": workflow["policy_code"],
        "priority": workflow["priority"],
        "expected_days": workflow["expected_days"],
        "actual_days": workflow["actual_days"],
        "is_overdue": workflow["is_overdue"],
        "has_anomaly": workflow["has_anomaly"],
        "status": workflow["status"],
    }
