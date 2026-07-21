from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

UmlNodeType = Literal[
    "start",
    "end",
    "flowFinal",
    "activity",
    "callAction",
    "acceptEvent",
    "sendSignal",
    "decision",
    "merge",
    "fork",
    "join",
    "object",
    "dataStore",
]
FormFieldType = Literal["text", "textarea", "date", "select", "number", "email", "tel"]
PolicyStatus = Literal["draft", "in_review", "published", "archived"]


class UmlNode(BaseModel):
    """Persisted element of an EASYDOC UML activity diagram."""

    model_config = ConfigDict(extra="allow")

    id: Annotated[str, Field(min_length=1, max_length=120)]
    type: UmlNodeType
    x: float
    y: float
    label: Annotated[str, Field(min_length=1, max_length=240)]
    department: Annotated[str, Field(max_length=160)] = ""
    assignee: Annotated[str, Field(max_length=160)] = ""
    description: Annotated[str, Field(max_length=2_000)] = ""
    lane_id: Annotated[
        str | None, Field(alias="laneId", serialization_alias="laneId", max_length=120)
    ] = None
    color: str | None = Field(default=None, max_length=32)

    @field_validator("id", "label", "department", "assignee", "description", mode="before")
    @classmethod
    def strip_text_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class UmlEdge(BaseModel):
    """Directed connection between two UML nodes."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    id: Annotated[str, Field(min_length=1, max_length=120)]
    source: Annotated[str, Field(alias="from", serialization_alias="from", min_length=1)]
    target: Annotated[str, Field(alias="to", serialization_alias="to", min_length=1)]
    label: Annotated[str, Field(max_length=240)] = ""
    kind: Literal["control", "object"] = "control"


class UmlLane(BaseModel):
    """Departamento o carril de responsabilidad de una actividad UML."""

    model_config = ConfigDict(extra="allow")

    id: Annotated[str, Field(min_length=1, max_length=120)]
    name: Annotated[str, Field(min_length=1, max_length=160)]
    color: str | None = Field(default=None, max_length=32)

    @field_validator("id", "name", mode="before")
    @classmethod
    def strip_text_fields(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class DiagramDefinition(BaseModel):
    """Diagram contract used by the EASYDOC web editor."""

    model_config = ConfigDict(extra="allow")

    nodes: list[UmlNode] = Field(default_factory=list)
    edges: list[UmlEdge] = Field(default_factory=list)
    lanes: list[UmlLane] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_graph_references(self) -> "DiagramDefinition":
        node_ids = [node.id for node in self.nodes]
        edge_ids = [edge.id for edge in self.edges]

        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Los nodos del diagrama deben tener identificadores unicos")
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("Las conexiones del diagrama deben tener identificadores unicos")

        lane_ids = [lane.id for lane in self.lanes]
        if len(lane_ids) != len(set(lane_ids)):
            raise ValueError("Los carriles del diagrama deben tener identificadores unicos")

        known_lanes = set(lane_ids)
        for node in self.nodes:
            if node.lane_id is not None and node.lane_id not in known_lanes:
                raise ValueError("Cada nodo debe pertenecer a un carril existente")

        known_nodes = set(node_ids)
        for edge in self.edges:
            if edge.source not in known_nodes or edge.target not in known_nodes:
                raise ValueError("Cada conexion debe referenciar nodos existentes")
            if edge.source == edge.target:
                raise ValueError("Una conexion no puede unir un nodo consigo mismo")

        return self


class FormQuestionDefinition(BaseModel):
    """Configurable question displayed to the applicant."""

    model_config = ConfigDict(extra="allow")

    id: Annotated[str, Field(min_length=1, max_length=120)]
    label: Annotated[str, Field(min_length=1, max_length=500)]
    type: FormFieldType
    required: bool = True
    options: str | list[str] = ""

    @field_validator("id", "label", mode="before")
    @classmethod
    def strip_required_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class AttachmentRequirementDefinition(BaseModel):
    """Independent document requirement for a policy."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    id: Annotated[str, Field(min_length=1, max_length=120)]
    label: Annotated[str, Field(min_length=1, max_length=500)]
    accepted_formats: Annotated[
        str, Field(alias="acceptedFormats", serialization_alias="acceptedFormats", min_length=1)
    ]
    required: bool = True

    @field_validator("id", "label", "accepted_formats", mode="before")
    @classmethod
    def strip_required_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class PolicyFormDefinition(BaseModel):
    """Dynamic form definition. Both lists may be empty."""

    model_config = ConfigDict(extra="allow")

    questions: list[FormQuestionDefinition] = Field(default_factory=list)
    attachments: list[AttachmentRequirementDefinition] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "PolicyFormDefinition":
        item_ids = [item.id for item in self.questions] + [item.id for item in self.attachments]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("Las preguntas y requisitos deben tener identificadores unicos")
        return self


class PolicyArtifact(BaseModel):
    """Versioned artifact associated with a business policy."""

    id: str
    title: str
    filename: str
    artifact_type: Literal["master_docx", "diagram_json", "requirements_xlsx"]
    document_id: str
    editable_roles: list[str] = Field(default_factory=list)
    storage_available: bool = True


class PolicyCreate(BaseModel):
    title: Annotated[str, Field(min_length=3, max_length=240)]
    description: Annotated[str | None, Field(max_length=4_000)] = None
    diagram_data: DiagramDefinition
    form_definition: PolicyFormDefinition = Field(default_factory=PolicyFormDefinition)

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class PolicyUpdate(BaseModel):
    title: Annotated[str | None, Field(min_length=3, max_length=240)] = None
    description: Annotated[str | None, Field(max_length=4_000)] = None
    diagram_data: DiagramDefinition | None = None
    form_definition: PolicyFormDefinition | None = None
    status: PolicyStatus | None = None
    expected_version: int | None = Field(default=None, ge=1)
    change_summary: Annotated[str | None, Field(max_length=1_000)] = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    title: str
    description: str | None = None
    diagram_data: DiagramDefinition
    form_definition: PolicyFormDefinition = Field(default_factory=PolicyFormDefinition)
    artifacts: list[PolicyArtifact] = Field(default_factory=list)
    status: PolicyStatus
    version: int = Field(ge=1)
    collaboration_revision: int = Field(default=0, ge=0)
    last_collaboration_at: datetime | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class PolicyListResponse(BaseModel):
    policies: list[PolicyResponse]
    total: int
    page: int
    page_size: int


class DiagramSuggestionRequest(BaseModel):
    """Context sent by the UML editor to the local policy-pattern recommender."""

    process_name: str = Field(default="", max_length=240)
    existing_node_types: list[UmlNodeType] = Field(default_factory=list, max_length=80)
    lane_names: list[str] = Field(default_factory=list, max_length=30)


class DiagramSuggestionResponse(BaseModel):
    """Reusable policy pattern returned by the local/offline recommender."""

    title: str
    confidence: int = Field(ge=0, le=100)
    rationale: str
    source_policy_id: str | None = None
    source_is_synthetic: bool = False
    diagram_data: DiagramDefinition
    form_definition: PolicyFormDefinition


class PolicyVersionResponse(BaseModel):
    id: str
    policy_id: str
    version: int
    title: str
    description: str | None = None
    diagram_data: DiagramDefinition
    form_definition: PolicyFormDefinition = Field(default_factory=PolicyFormDefinition)
    status: PolicyStatus
    created_by: str
    created_at: datetime
    change_summary: str


class WorkflowStart(BaseModel):
    policy_id: str
    context: dict[str, object] | None = None


class WorkflowAction(BaseModel):
    action: str
    decision: str | None = None
    comments: str | None = None
