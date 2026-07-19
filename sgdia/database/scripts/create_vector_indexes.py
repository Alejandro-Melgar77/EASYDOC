"""Create or preview Atlas Vector Search indexes for EASYDOC.

By default this script only prints the definitions. Use ``--apply`` against
MongoDB Atlas after configuring ``MONGODB_URL`` and ``MONGODB_DB_NAME``.
"""

import argparse
import asyncio
import json
import os

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

VECTOR_INDEXES = {
    "documents": {
        "name": "documents_vector_search",
        "type": "vectorSearch",
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding_vector",
                    "numDimensions": 1536,
                    "similarity": "cosine",
                },
                {"type": "filter", "path": "status"},
                {"type": "filter", "path": "is_deleted"},
            ]
        },
    },
    "policies": {
        "name": "policies_vector_search",
        "type": "vectorSearch",
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding_vector",
                    "numDimensions": 1536,
                    "similarity": "cosine",
                },
                {"type": "filter", "path": "status"},
                {"type": "filter", "path": "is_deleted"},
            ]
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Gestiona indices Atlas Vector Search")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Crea los indices en MongoDB Atlas; sin esta opcion solo muestra el JSON",
    )
    return parser.parse_args()


async def apply_indexes() -> None:
    url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/sgdia")
    database_name = os.getenv("MONGODB_DB_NAME", "sgdia")
    client = AsyncIOMotorClient(url)
    database = client[database_name]

    try:
        for collection, index in VECTOR_INDEXES.items():
            try:
                await database.command(
                    "createSearchIndexes",
                    collection,
                    indexes=[index],
                )
                print(f"[OK] Indice vectorial creado: {collection}/{index['name']}")
            except OperationFailure as exc:
                print(
                    f"[WARN] No se pudo crear {collection}/{index['name']}: {exc}. "
                    "Verifica que la base sea MongoDB Atlas."
                )
    finally:
        client.close()


def main() -> None:
    args = parse_args()
    if not args.apply:
        print(json.dumps(VECTOR_INDEXES, indent=2, ensure_ascii=True))
        print("Usa --apply para crear los indices en MongoDB Atlas.")
        return
    asyncio.run(apply_indexes())


if __name__ == "__main__":
    main()
