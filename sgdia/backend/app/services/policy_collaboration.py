"""Redis-aware WebSocket rooms for real EASYDOC policy collaboration."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.redis import get_redis

logger = logging.getLogger(__name__)
_CHANNEL = "easydoc:policy-collaboration"
_PRESENCE_PREFIX = "easydoc:policy-presence"
_PRESENCE_TTL_SECONDS = 75


@dataclass(eq=False, slots=True)
class PolicyConnection:
    """One browser connection in a policy room."""

    websocket: WebSocket
    user_id: str
    presence_key: str = field(default_factory=lambda: uuid.uuid4().hex)


class PolicyCollaborationManager:
    """Synchronize policy operations locally and through Redis Pub/Sub."""

    def __init__(self) -> None:
        self._rooms: dict[str, list[PolicyConnection]] = {}
        self._instance_id = uuid.uuid4().hex
        self._redis: aioredis.Redis | None = None
        self._pubsub: aioredis.client.PubSub | None = None
        self._listener_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        """Begin accepting cross-instance events after Redis has initialized."""
        if self._listener_task is not None:
            return
        self._redis = get_redis()
        self._pubsub = self._redis.pubsub()
        await self._pubsub.subscribe(_CHANNEL)
        self._listener_task = asyncio.create_task(self._listen(), name="policy-collaboration-redis")

    async def stop(self) -> None:
        """Stop the relay before the Redis connection pool is closed."""
        if self._listener_task is not None:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            self._listener_task = None
        if self._pubsub is not None:
            await self._pubsub.unsubscribe(_CHANNEL)
            await self._pubsub.aclose()
            self._pubsub = None
        self._redis = None

    def connected_user_ids(self, policy_id: str) -> list[str]:
        """Return distinct local users. Used by isolated unit tests as well."""
        return list(dict.fromkeys(item.user_id for item in self._rooms.get(policy_id, [])))

    def connection_count(self, policy_id: str) -> int:
        """Return the number of local browser sockets in a policy room."""
        return len(self._rooms.get(policy_id, []))

    async def connect(self, websocket: WebSocket, policy_id: str, user_id: str) -> None:
        """Accept an authenticated connection and publish its real presence."""
        await websocket.accept()
        connection = PolicyConnection(websocket=websocket, user_id=user_id)
        self._rooms.setdefault(policy_id, []).append(connection)
        await self._write_presence(policy_id, connection)
        await self.broadcast_presence(policy_id, notify_other_instances=True)

    async def touch(self, websocket: WebSocket, policy_id: str) -> None:
        """Refresh a presence record when a client heartbeat arrives."""
        connection = self._connection(policy_id, websocket)
        if connection is not None:
            await self._write_presence(policy_id, connection)

    async def disconnect(self, websocket: WebSocket, policy_id: str) -> None:
        """Remove a connection and update every active instance's presence view."""
        connection = self._connection(policy_id, websocket)
        if connection is None:
            return
        self._remove_connection(policy_id, websocket)
        if self._redis is not None:
            await self._redis.delete(self._presence_key(policy_id, connection.presence_key))
        await self.broadcast_presence(policy_id, notify_other_instances=True)

    async def broadcast_operation(
        self,
        policy_id: str,
        operation: str,
        payload: dict[str, Any],
        actor_id: str,
        sender: WebSocket,
        client_operation_id: str | None = None,
        revision: int | None = None,
    ) -> None:
        """Forward an operation to local peers and every other API instance."""
        message: dict[str, Any] = {
            "type": "operation",
            "policy_id": policy_id,
            "operation": operation,
            "payload": payload,
            "actor_id": actor_id,
        }
        if client_operation_id is not None:
            message["client_operation_id"] = client_operation_id
        if revision is not None:
            message["revision"] = revision
        if await self._broadcast(policy_id, message, excluded_websocket=sender):
            await self.broadcast_presence(policy_id, notify_other_instances=True)
        await self._publish({"kind": "operation", "policy_id": policy_id, "message": message})

    async def broadcast_presence(
        self, policy_id: str, notify_other_instances: bool = False
    ) -> None:
        """Broadcast a snapshot of distinct, currently connected people."""
        message = {
            "type": "presence",
            "policy_id": policy_id,
            "users": await self._distributed_user_ids(policy_id),
        }
        await self._broadcast(policy_id, message)
        if notify_other_instances:
            await self._publish({"kind": "presence", "policy_id": policy_id})

    async def _listen(self) -> None:
        assert self._pubsub is not None
        try:
            async for raw in self._pubsub.listen():
                if raw.get("type") != "message":
                    continue
                try:
                    event = json.loads(raw["data"])
                except (TypeError, json.JSONDecodeError):
                    continue
                if event.get("origin") == self._instance_id:
                    continue
                policy_id = event.get("policy_id")
                if not isinstance(policy_id, str):
                    continue
                if event.get("kind") == "operation" and isinstance(event.get("message"), dict):
                    await self._broadcast(policy_id, event["message"])
                elif event.get("kind") == "presence":
                    await self.broadcast_presence(policy_id)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Policy collaboration Redis relay stopped unexpectedly")

    async def _publish(self, event: dict[str, Any]) -> None:
        if self._redis is None:
            return
        await self._redis.publish(
            _CHANNEL, json.dumps({**event, "origin": self._instance_id}, ensure_ascii=True)
        )

    async def _distributed_user_ids(self, policy_id: str) -> list[str]:
        if self._redis is None:
            return self.connected_user_ids(policy_id)
        keys = await self._redis.keys(f"{_PRESENCE_PREFIX}:{policy_id}:*")
        if not keys:
            return self.connected_user_ids(policy_id)
        values = await self._redis.mget(keys)
        return list(dict.fromkeys(value for value in values if isinstance(value, str) and value))

    async def _write_presence(self, policy_id: str, connection: PolicyConnection) -> None:
        if self._redis is not None:
            await self._redis.set(
                self._presence_key(policy_id, connection.presence_key),
                connection.user_id,
                ex=_PRESENCE_TTL_SECONDS,
            )

    @staticmethod
    def _presence_key(policy_id: str, connection_id: str) -> str:
        return f"{_PRESENCE_PREFIX}:{policy_id}:{connection_id}"

    async def _broadcast(
        self,
        policy_id: str,
        message: dict[str, Any],
        excluded_websocket: WebSocket | None = None,
    ) -> bool:
        failed: list[WebSocket] = []
        for connection in tuple(self._rooms.get(policy_id, [])):
            if connection.websocket is excluded_websocket:
                continue
            try:
                await connection.websocket.send_json(message)
            except Exception:
                logger.info("Closing unavailable policy socket", exc_info=True)
                failed.append(connection.websocket)
        for socket in failed:
            self._remove_connection(policy_id, socket)
        return bool(failed)

    def _connection(self, policy_id: str, websocket: WebSocket) -> PolicyConnection | None:
        return next(
            (item for item in self._rooms.get(policy_id, []) if item.websocket is websocket), None
        )

    def _remove_connection(self, policy_id: str, websocket: WebSocket) -> bool:
        room = self._rooms.get(policy_id)
        if room is None:
            return False
        remaining = [item for item in room if item.websocket is not websocket]
        if len(remaining) == len(room):
            return False
        if remaining:
            self._rooms[policy_id] = remaining
        else:
            self._rooms.pop(policy_id, None)
        return True


policy_collaboration_manager = PolicyCollaborationManager()
