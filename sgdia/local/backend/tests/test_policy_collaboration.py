from unittest.mock import AsyncMock

import pytest
from app.services.policy_collaboration import PolicyCollaborationManager


class FakeWebSocket:
    def __init__(self) -> None:
        self.accept = AsyncMock()
        self.send_json = AsyncMock()


@pytest.mark.asyncio
async def test_connect_broadcasts_only_real_connected_users() -> None:
    manager = PolicyCollaborationManager()
    first_socket = FakeWebSocket()
    second_socket = FakeWebSocket()

    await manager.connect(first_socket, "policy-1", "user-1")
    await manager.connect(second_socket, "policy-1", "user-2")

    assert manager.connected_user_ids("policy-1") == ["user-1", "user-2"]
    assert first_socket.accept.await_count == 1
    assert second_socket.accept.await_count == 1
    assert first_socket.send_json.await_args_list[-1].args[0] == {
        "type": "presence",
        "policy_id": "policy-1",
        "users": ["user-1", "user-2"],
    }
    assert second_socket.send_json.await_args_list[-1].args[0] == {
        "type": "presence",
        "policy_id": "policy-1",
        "users": ["user-1", "user-2"],
    }


@pytest.mark.asyncio
async def test_operation_is_broadcast_to_other_sessions_in_same_policy() -> None:
    manager = PolicyCollaborationManager()
    sender_socket = FakeWebSocket()
    receiver_socket = FakeWebSocket()
    other_policy_socket = FakeWebSocket()

    await manager.connect(sender_socket, "policy-1", "user-1")
    await manager.connect(receiver_socket, "policy-1", "user-2")
    await manager.connect(other_policy_socket, "policy-2", "user-3")
    sender_socket.send_json.reset_mock()
    receiver_socket.send_json.reset_mock()
    other_policy_socket.send_json.reset_mock()

    await manager.broadcast_operation(
        policy_id="policy-1",
        operation="node.create",
        payload={"id": "node-7", "label": "Revisar solicitud"},
        actor_id="user-1",
        sender=sender_socket,
        client_operation_id="client-op-1",
    )

    sender_socket.send_json.assert_not_awaited()
    other_policy_socket.send_json.assert_not_awaited()
    receiver_socket.send_json.assert_awaited_once_with(
        {
            "type": "operation",
            "policy_id": "policy-1",
            "operation": "node.create",
            "payload": {"id": "node-7", "label": "Revisar solicitud"},
            "actor_id": "user-1",
            "client_operation_id": "client-op-1",
        }
    )


@pytest.mark.asyncio
async def test_disconnect_updates_presence_without_removing_other_tabs() -> None:
    manager = PolicyCollaborationManager()
    first_tab = FakeWebSocket()
    second_tab = FakeWebSocket()
    other_user = FakeWebSocket()

    await manager.connect(first_tab, "policy-1", "user-1")
    await manager.connect(second_tab, "policy-1", "user-1")
    await manager.connect(other_user, "policy-1", "user-2")
    first_tab.send_json.reset_mock()
    second_tab.send_json.reset_mock()
    other_user.send_json.reset_mock()

    await manager.disconnect(first_tab, "policy-1")

    assert manager.connection_count("policy-1") == 2
    assert manager.connected_user_ids("policy-1") == ["user-1", "user-2"]
    assert second_tab.send_json.await_args.args[0]["users"] == ["user-1", "user-2"]
    assert other_user.send_json.await_args.args[0]["users"] == ["user-1", "user-2"]

    await manager.disconnect(second_tab, "policy-1")

    assert manager.connected_user_ids("policy-1") == ["user-2"]
    assert other_user.send_json.await_args.args[0]["users"] == ["user-2"]
