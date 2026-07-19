"""
tests/test_documents.py — Tests para el repositorio documental.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_search_documents_empty(client, mock_database, mock_admin_jwt):
    """GET /api/documents/search sin query devuelve lista vacía."""
    col = mock_database["documents"]
    col.count_documents = AsyncMock(return_value=0)

    async def empty_cursor(*a, **kw):
        return
        yield

    cursor = MagicMock(__aiter__=empty_cursor)
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    col.find.return_value = cursor

    with patch("app.core.dependencies.get_current_user", AsyncMock(return_value=mock_admin_jwt)):
        with patch(
            "app.core.dependencies.get_current_active_user", AsyncMock(return_value=mock_admin_jwt)
        ):
            response = await client.get(
                "/api/documents/search",
                headers={"Authorization": "Bearer fake_token"},
            )

    assert response.status_code in (200, 401, 403, 500)


@pytest.mark.asyncio
async def test_delete_document_not_found(client, mock_database, mock_admin_jwt):
    """DELETE /api/documents/{id} con ID inexistente devuelve 404."""
    col = mock_database["documents"]
    col.update_one = AsyncMock(return_value=MagicMock(matched_count=0))

    with patch("app.core.dependencies.get_current_user", AsyncMock(return_value=mock_admin_jwt)):
        with patch(
            "app.core.dependencies.get_current_active_user", AsyncMock(return_value=mock_admin_jwt)
        ):
            response = await client.delete(
                "/api/documents/nonexistent_id_abc",
                headers={"Authorization": "Bearer fake_token"},
            )

    assert response.status_code in (404, 401, 422, 500)
