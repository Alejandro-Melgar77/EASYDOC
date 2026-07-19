from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RouteStep(BaseModel):
    node_id: str
    node_name: str
    assigned_to: str | None
    estimated_days: float
    confidence: float


class RoutePredictionResponse(BaseModel):
    document_id: str
    predicted_route: list[RouteStep]
    total_estimated_days: float
    model_confidence: float
    generated_at: datetime


class BottleneckItem(BaseModel):
    node_id: str
    node_name: str
    avg_wait_days: float
    pending_items: int
    severity: str  # low | medium | high | critical


class BottleneckResponse(BaseModel):
    bottlenecks: list[BottleneckItem]
    analyzed_at: datetime


class AnomalyItem(BaseModel):
    entity_type: str  # document | workflow | user
    entity_id: str
    anomaly_type: str
    score: float  # 0-1, higher = more anomalous
    description: str
    detected_at: datetime


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyItem]
    total: int
    period_days: int


class ResourceRequest(BaseModel):
    items: list[dict[str, Any]]  # Each item: {id, type, priority_hint, deadline}
    available_resources: int | None = None


class ResourceItem(BaseModel):
    item_id: str
    priority_score: float
    recommended_assignee: str | None
    suggested_deadline: datetime | None
    reasoning: str


class ResourceResponse(BaseModel):
    prioritized_items: list[ResourceItem]
    optimization_score: float
    generated_at: datetime


class PredictionDashboard(BaseModel):
    bottlenecks_count: int
    anomalies_count: int
    avg_route_days: float
    pending_workflows: int
    top_bottleneck: BottleneckItem | None
    recent_anomalies: list[AnomalyItem]
    last_updated: datetime


class ModelStatusResponse(BaseModel):
    """Provenance and held-out evaluation of the local route-risk baseline."""

    model_name: str
    model_type: str
    trained_at: datetime
    sample_count: int
    is_synthetic: bool
    route_match_rate: float = 0.0
    duration_mae_days: float = 0.0
    policies_evaluated: int = 0
    resource_load: dict[str, float] = Field(default_factory=dict)


class TrainingReadinessResponse(BaseModel):
    """Guardrail status for any future model trained with operational data."""

    engine: str
    decision: str
    automation_enabled: bool
    real_completed_workflows: int = Field(ge=0)
    synthetic_workflows: int = Field(ge=0)
    minimum_real_completed_workflows: int = Field(ge=1)
    policies_observed: list[str] = Field(default_factory=list)
    missing_event_fields: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    data_is_synthetic_only: bool
