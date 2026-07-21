"""Migrate the legacy policy-name index to EASYDOC policy persistence indexes."""

import asyncio

from app.core.config import get_settings
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from pymongo.errors import OperationFailure


async def migrate() -> None:
    """Replace the obsolete unique name index and create policy history indexes."""
    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL, uuidRepresentation="standard")
    database = client[settings.MONGODB_DB_NAME]

    try:
        try:
            await database["policies"].drop_index("name_1")
            print("Dropped obsolete policies.name_1 index")
        except OperationFailure as exc:
            if exc.code != 27:
                raise

        await database["policies"].create_index(
            [("title", ASCENDING)],
            unique=True,
            partialFilterExpression={"title": {"$type": "string"}},
            name="unique_policy_title",
        )
        await database["policies"].create_index([("updated_at", ASCENDING)])
        await database["policy_versions"].create_index(
            [("policy_id", ASCENDING), ("version", ASCENDING)],
            unique=True,
            name="unique_policy_version",
        )
        await database["policy_versions"].create_index([("policy_id", ASCENDING)])
        print("Policy persistence indexes are ready")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
