"""
tests/test_predictions.py — Tests para el motor ML de predicciones.
"""

from unittest.mock import AsyncMock, patch

import pytest

# ─────────────────────────────────────────────────────────────────────────────
# RoutePredictor unit tests (sin DB)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_route_predictor_returns_steps(mock_database):
    """predict() debe devolver una RoutePredictionResponse con >=2 steps."""
    from app.ml.route_predictor import RoutePredictor

    mock_database["documents"].find_one = AsyncMock(return_value=None)

    predictor = RoutePredictor()
    result = await predictor.predict("doc_abc_123")

    assert result.document_id == "doc_abc_123"
    assert len(result.predicted_route) >= 2
    assert result.total_estimated_days > 0
    assert 0.0 <= result.model_confidence <= 1.0


@pytest.mark.asyncio
async def test_route_predictor_contract_type(mock_database):
    """Documentos con tag 'contract' deben tener 5 pasos (incluyendo Revisión Legal)."""
    from app.ml.route_predictor import RoutePredictor

    mock_database["documents"].find_one = AsyncMock(
        return_value={
            "_id": "doc1",
            "filename": "acuerdo.docx",
            "tags": ["contract"],
        }
    )

    with patch("app.ml.route_predictor.get_database", return_value=mock_database):
        predictor = RoutePredictor()
        result = await predictor.predict("doc1")

    node_names = [s.node_name for s in result.predicted_route]
    assert "Revisión Legal" in node_names
    assert len(result.predicted_route) == 5


# ─────────────────────────────────────────────────────────────────────────────
# BottleneckDetector unit tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_bottleneck_detector_empty(mock_database):
    """Con colección vacía debe devolver lista de cuellos de botella vacía."""
    from app.ml.bottleneck_detector import BottleneckDetector

    async def empty_agg(*a, **kw):
        return
        yield

    mock_database["workflow_instances"].aggregate = MagicMock(
        return_value=MagicMock(__aiter__=empty_agg)
    )

    detector = BottleneckDetector()
    result = await detector.detect(lookback_days=30)

    assert result.bottlenecks == []


# ─────────────────────────────────────────────────────────────────────────────
# AnomalyDetector unit tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_anomaly_detector_empty(mock_database):
    """Con logs vacíos no debe detectar anomalías."""
    from app.ml.anomaly_detector import AnomalyDetector

    async def empty_agg(*a, **kw):
        return
        yield

    mock_database["audit_logs"].aggregate = MagicMock(return_value=MagicMock(__aiter__=empty_agg))

    detector = AnomalyDetector()
    result = await detector.detect(period_days=7)

    assert result.total == 0
    assert result.anomalies == []


# ─────────────────────────────────────────────────────────────────────────────
# ResourceOptimizer unit tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_resource_optimizer_ordering():
    """Los ítems deben ordenarse de mayor a menor priority_score."""
    from app.ml.resource_optimizer import ResourceOptimizer

    items = [
        {"id": "low", "type": "report", "priority_hint": 0.1},
        {"id": "high", "type": "contract", "priority_hint": 0.9},
        {"id": "mid", "type": "invoice", "priority_hint": 0.5},
    ]

    optimizer = ResourceOptimizer()
    result = await optimizer.optimize(items)

    scores = [i.priority_score for i in result.prioritized_items]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_resource_optimizer_empty():
    """Lista vacía devuelve optimization_score=1.0."""
    from app.ml.resource_optimizer import ResourceOptimizer

    optimizer = ResourceOptimizer()
    result = await optimizer.optimize([])

    assert result.prioritized_items == []
    assert result.optimization_score == 1.0


from unittest.mock import MagicMock
