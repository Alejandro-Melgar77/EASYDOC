from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response

from app.core.database import get_database
from app.core.dependencies import require_permissions
from app.schemas.common import MessageResponse
from app.schemas.policies import (
    DiagramSuggestionRequest,
    DiagramSuggestionResponse,
    PolicyCreate,
    PolicyListResponse,
    PolicyResponse,
    PolicyUpdate,
    WorkflowAction,
    WorkflowStart,
)
from app.services.audit_service import AuditService
from app.services.diagram_suggestion_service import DiagramSuggestionService
from app.services.export_service import ExportService
from app.services.policy_service import (
    PolicyAlreadyExistsError,
    PolicyNotFoundError,
    PolicyService,
    PolicyVersionConflictError,
)
from app.services.workflow_engine import WorkflowEngine

router = APIRouter(prefix="/policies", tags=["Policies and workflows"])
workflow_engine = WorkflowEngine()
export_service = ExportService()
policy_service = PolicyService()
diagram_suggestion_service = DiagramSuggestionService()


def _policy_not_found() -> None:
    raise HTTPException(status_code=404, detail="Policy not found")


@router.post("/", response_model=PolicyResponse, status_code=201)
async def create_policy(
    data: PolicyCreate,
    request: Request,
    current_user: dict = Depends(require_permissions("policies:write")),
) -> PolicyResponse:
    """Create a draft policy with its UML diagram and dynamic form."""
    try:
        can_publish = bool(
            {"Administrador", "Director", "Gerente"} & set(current_user.get("roles", []))
        )
        policy = await policy_service.create(
            data,
            current_user["sub"],
            initial_status="published" if can_publish else "draft",
        )
    except PolicyAlreadyExistsError:
        raise HTTPException(status_code=409, detail="A policy with this title already exists")

    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["POLICY_CREATE"],
        entity_type="policy",
        entity_id=policy["id"],
        ip_address=getattr(request.state, "ip_address", None),
        details={"version": policy["version"]},
    )
    return PolicyResponse(**policy)


@router.get("/", response_model=PolicyListResponse)
async def list_policies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(default=None, pattern="^(draft|in_review|published|archived)$"),
    current_user: dict = Depends(require_permissions("policies:read")),
) -> PolicyListResponse:
    """List saved policies so they can be reopened for editing."""
    result = await policy_service.list(page=page, page_size=page_size, status=status)
    return PolicyListResponse(**result)


@router.post("/suggestions", response_model=DiagramSuggestionResponse)
async def suggest_policy_diagram(
    data: DiagramSuggestionRequest,
    current_user: dict = Depends(require_permissions("policies:write")),
) -> DiagramSuggestionResponse:
    """Suggest a reusable UML pattern from the locally persisted policy corpus."""
    del current_user
    result = await diagram_suggestion_service.suggest(
        process_name=data.process_name,
        existing_node_types=data.existing_node_types,
        lane_names=data.lane_names,
    )
    return DiagramSuggestionResponse(**result)


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: str,
    current_user: dict = Depends(require_permissions("policies:read")),
) -> PolicyResponse:
    """Load a saved diagram and its associated form definition."""
    try:
        policy = await policy_service.get(policy_id)
    except PolicyNotFoundError:
        _policy_not_found()
    return PolicyResponse(**policy)


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: str,
    data: PolicyUpdate,
    request: Request,
    current_user: dict = Depends(require_permissions("policies:write")),
) -> PolicyResponse:
    """Save a policy revision, optionally using optimistic concurrency control."""
    try:
        policy = await policy_service.update(policy_id, data, current_user["sub"])
    except PolicyNotFoundError:
        _policy_not_found()
    except PolicyVersionConflictError:
        raise HTTPException(
            status_code=409,
            detail="The policy was changed by another editor. Reload it before saving again.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["POLICY_UPDATE"],
        entity_type="policy",
        entity_id=policy_id,
        ip_address=getattr(request.state, "ip_address", None),
        details={"version": policy["version"]},
    )
    return PolicyResponse(**policy)


@router.post("/{policy_id}/submit-review", response_model=MessageResponse)
async def submit_for_review(
    policy_id: str,
    request: Request,
    current_user: dict = Depends(require_permissions("policies:write")),
) -> MessageResponse:
    """Move a policy to review and preserve the state as a new version."""
    try:
        await policy_service.update(
            policy_id,
            PolicyUpdate(status="in_review", change_summary="Submitted for review"),
            current_user["sub"],
        )
    except PolicyNotFoundError:
        _policy_not_found()

    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["POLICY_SUBMIT_REVIEW"],
        entity_type="policy",
        entity_id=policy_id,
        ip_address=getattr(request.state, "ip_address", None),
    )
    return MessageResponse(message="Policy submitted for review", status_code=200)


@router.post("/{policy_id}/approve", response_model=MessageResponse)
async def approve_policy(
    policy_id: str,
    request: Request,
    current_user: dict = Depends(require_permissions("policies:approve")),
) -> MessageResponse:
    """Publish a policy and preserve the transition in its version history."""
    try:
        await policy_service.update(
            policy_id,
            PolicyUpdate(status="published", change_summary="Approved and published"),
            current_user["sub"],
        )
    except PolicyNotFoundError:
        _policy_not_found()

    await AuditService.log_action(
        user_id=current_user["sub"],
        action=AuditService.ACTIONS["POLICY_APPROVE"],
        entity_type="policy",
        entity_id=policy_id,
        ip_address=getattr(request.state, "ip_address", None),
    )
    return MessageResponse(message="Policy approved and published", status_code=200)


@router.get("/{policy_id}/export")
async def export_policy(
    policy_id: str,
    format: str = "svg",
    current_user: dict = Depends(require_permissions("policies:read")),
) -> Response:
    """Export a persisted diagram as SVG, PNG, or XMI."""
    try:
        policy = await policy_service.get(policy_id)
    except PolicyNotFoundError:
        _policy_not_found()

    diagram_data = policy["diagram_data"]
    if format.lower() == "svg":
        content = await export_service.export_diagram_to_svg(diagram_data)
        return Response(content=content, media_type="image/svg+xml")
    if format.lower() == "png":
        content = await export_service.export_diagram_to_png(diagram_data)
        return Response(content=content, media_type="image/png")
    if format.lower() == "xmi":
        content = await export_service.export_diagram_to_xmi(diagram_data)
        return Response(content=content, media_type="application/xml")
    raise HTTPException(status_code=400, detail="Unsupported format. Use svg, png, or xmi")


@router.post("/workflows/start", response_model=dict)
async def start_workflow(
    data: WorkflowStart,
    current_user: dict = Depends(require_permissions("workflows:execute")),
) -> dict:
    """Start an instance from a published policy."""
    try:
        policy = await policy_service.get(data.policy_id)
    except PolicyNotFoundError:
        _policy_not_found()
    if policy["status"] != "published":
        raise HTTPException(status_code=400, detail="Policy not found or not published")

    graph = await workflow_engine.parse_diagram(policy["diagram_data"])
    instance = await workflow_engine.start_instance(
        data.policy_id, graph, current_user["sub"], data.context
    )
    if not instance:
        raise HTTPException(status_code=400, detail="Could not start workflow from this diagram")

    result = await get_database()["workflow_instances"].insert_one(instance)
    instance["id"] = str(result.inserted_id)
    return instance


@router.post("/workflows/{instance_id}/advance", response_model=dict)
async def advance_workflow(
    instance_id: str,
    action: WorkflowAction,
    current_user: dict = Depends(require_permissions("workflows:execute")),
) -> dict:
    """Advance a workflow instance to the next element of the saved graph."""
    if not ObjectId.is_valid(instance_id):
        raise HTTPException(status_code=404, detail="Workflow instance not found")

    instances_col = get_database()["workflow_instances"]
    instance = await instances_col.find_one({"_id": ObjectId(instance_id)})
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow instance not found")

    try:
        policy = await policy_service.get(instance["policy_id"])
    except PolicyNotFoundError:
        _policy_not_found()
    graph = await workflow_engine.parse_diagram(policy["diagram_data"])
    updated_instance = await workflow_engine.advance(
        instance, graph, action.model_dump(), current_user["sub"]
    )

    await instances_col.update_one(
        {"_id": ObjectId(instance_id)},
        {
            "$set": {
                "status": updated_instance["status"],
                "current_node_id": updated_instance["current_node_id"],
                "history": updated_instance["history"],
            }
        },
    )
    updated_instance["id"] = instance_id
    updated_instance.pop("_id", None)
    return updated_instance
