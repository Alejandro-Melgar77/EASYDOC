"""
scripts/create_vector_indexes.py

Script para crear los índices de Atlas Vector Search en MongoDB.
Requiere MongoDB 6.0+ o MongoDB Atlas.

Uso:
    python scripts/create_vector_indexes.py

Nota: Los índices vectoriales no pueden crearse con PyMongo directamente
en Atlas — deben crearse via la API de Atlas o con el comando admin.
Este script crea los índices usando el comando 'createSearchIndexes'.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


async def create_vector_indexes():
    from app.core.config import get_settings
    from motor.motor_asyncio import AsyncIOMotorClient

    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    vector_indexes = [
        {
            "collection": "documents",
            "index": {
                "name": "document_embedding_index",
                "type": "vectorSearch",
                "definition": {
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding_vector",
                            "numDimensions": 1536,
                            "similarity": "cosine",
                        }
                    ]
                },
            },
        },
        {
            "collection": "policies",
            "index": {
                "name": "policy_embedding_index",
                "type": "vectorSearch",
                "definition": {
                    "fields": [
                        {
                            "type": "vector",
                            "path": "embedding_vector",
                            "numDimensions": 1536,
                            "similarity": "cosine",
                        }
                    ]
                },
            },
        },
    ]

    for item in vector_indexes:
        try:
            col = db[item["collection"]]
            # create_search_index disponible en Motor >= 3.3 con MongoDB 7.0+
            await col.create_search_index(item["index"])
            print(f"✅ Vector index created on '{item['collection']}'")
        except Exception as exc:
            print(f"⚠️  Could not create vector index on '{item['collection']}': {exc}")
            print("   → Para Atlas: crear manualmente desde la UI de Atlas Search")

    client.close()
    print("\n✅ Vector indexes setup complete.")


if __name__ == "__main__":
    asyncio.run(create_vector_indexes())
