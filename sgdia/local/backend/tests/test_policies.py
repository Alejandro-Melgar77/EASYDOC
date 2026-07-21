import pytest
from app.schemas.policies import DiagramDefinition
from pydantic import ValidationError


def test_activity_diagram_accepts_swimlanes_and_object_flow():
    diagram = DiagramDefinition.model_validate(
        {
            "lanes": [
                {"id": "secretaria", "name": "Secretaria academica"},
                {"id": "direccion", "name": "Direccion de carrera"},
            ],
            "nodes": [
                {
                    "id": "inicio",
                    "type": "start",
                    "x": 240,
                    "y": 90,
                    "label": "Inicio",
                    "laneId": "secretaria",
                },
                {
                    "id": "registro",
                    "type": "activity",
                    "x": 450,
                    "y": 90,
                    "label": "Registrar solicitud",
                    "laneId": "secretaria",
                },
                {
                    "id": "expediente",
                    "type": "object",
                    "x": 660,
                    "y": 90,
                    "label": "Expediente",
                    "laneId": "direccion",
                },
            ],
            "edges": [
                {"id": "control-1", "from": "inicio", "to": "registro"},
                {
                    "id": "object-1",
                    "from": "registro",
                    "to": "expediente",
                    "kind": "object",
                },
            ],
        }
    )

    assert diagram.nodes[0].lane_id == "secretaria"
    assert diagram.edges[1].kind == "object"


def test_activity_diagram_rejects_unknown_swimlane():
    with pytest.raises(ValidationError, match="carril existente"):
        DiagramDefinition.model_validate(
            {
                "lanes": [{"id": "secretaria", "name": "Secretaria academica"}],
                "nodes": [
                    {
                        "id": "inicio",
                        "type": "start",
                        "x": 240,
                        "y": 90,
                        "label": "Inicio",
                        "laneId": "inexistente",
                    }
                ],
            }
        )


def test_export_service():
    pass


def test_policy_crud():
    pass
