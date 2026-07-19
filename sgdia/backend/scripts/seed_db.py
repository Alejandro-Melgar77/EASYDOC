#!/usr/bin/env python3
"""
scripts/seed_db.py

Script de poblacion inicial de la base de datos EASYDOC.
Crea los roles base, el usuario administrador y configuración inicial.

Uso:
    python scripts/seed_db.py
    python scripts/seed_db.py --reset  # limpia la BD antes de insertar
"""

import argparse
import asyncio
import os
import sys

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import UTC, datetime

ROLES = [
    {
        "name": "Administrador",
        "description": "Acceso total al sistema",
        "permissions": [
            "documents:read",
            "documents:write",
            "documents:delete",
            "users:read",
            "users:write",
            "users:delete",
            "roles:read",
            "roles:write",
            "roles:delete",
            "policies:read",
            "policies:write",
            "policies:approve",
            "reports:read",
            "reports:create",
            "audit:read",
            "audit:export",
            "predictions:read",
            "agent:use",
            "workflows:execute",
            "settings:read",
            "settings:write",
        ],
        "is_system": True,
    },
    {
        "name": "Analista",
        "description": "Gestión documental y consulta al agente IA",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "policies:write",
            "reports:read",
            "reports:create",
            "agent:use",
            "workflows:execute",
            "predictions:read",
        ],
        "is_system": True,
    },
    {
        "name": "Revisor",
        "description": "Revisión y aprobación de políticas",
        "permissions": [
            "documents:read",
            "policies:read",
            "policies:approve",
            "audit:read",
        ],
        "is_system": True,
    },
    {
        "name": "Usuario",
        "description": "Consulta básica y uso del agente IA",
        "permissions": [
            "documents:read",
            "agent:use",
        ],
        "is_system": True,
    },
    {
        "name": "Director",
        "description": "Supervisa, aprueba y publica resultados academicos sensibles",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "policies:write",
            "policies:approve",
            "reports:read",
            "reports:create",
            "audit:read",
            "predictions:read",
            "agent:use",
            "workflows:execute",
        ],
        "is_system": True,
    },
    {
        "name": "Gerente",
        "description": "Gestiona la operacion, riesgos y aprobaciones de alto nivel",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "policies:write",
            "policies:approve",
            "reports:read",
            "reports:create",
            "audit:read",
            "predictions:read",
            "agent:use",
            "workflows:execute",
        ],
        "is_system": True,
    },
    {
        "name": "Coordinador",
        "description": "Propone cambios de politica y coordina las tareas de su departamento",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "policies:write",
            "reports:read",
            "reports:create",
            "predictions:read",
            "agent:use",
            "workflows:execute",
        ],
        "is_system": True,
    },
    {
        "name": "Funcionario",
        "description": "Ejecuta tareas y coedita documentos asignados a su departamento",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "agent:use",
            "workflows:execute",
        ],
        "is_system": True,
    },
    {
        "name": "Trabajador",
        "description": "Ejecuta tareas documentales asignadas y consulta politicas vigentes",
        "permissions": [
            "documents:read",
            "documents:write",
            "policies:read",
            "workflows:execute",
        ],
        "is_system": True,
    },
]

ADMIN_USER = {
    "email": "directora@easydoc.edu",
    "password": "password123",
    "full_name": "Dra. Camila Ferrufino",
    "role_name": "Administrador",
}

SYSTEM_SETTINGS = [
    {"key": "max_file_size_mb", "value": 100, "description": "Tamaño máximo de archivo en MB"},
    {
        "key": "allowed_file_types",
        "value": ["pdf", "docx", "xlsx", "pptx", "png", "jpg"],
        "description": "Tipos de archivo permitidos",
    },
    {"key": "session_timeout_min", "value": 480, "description": "Timeout de sesión en minutos"},
    {
        "key": "llm_provider",
        "value": "local_offline",
        "description": "Motor local de asistencia activo",
    },
    {"key": "rag_top_k", "value": 5, "description": "Documentos a recuperar en RAG"},
    {"key": "maintenance_mode", "value": False, "description": "Modo mantenimiento"},
]


async def seed(reset: bool = False):
    from app.core.config import get_settings
    from app.core.security import hash_password
    from motor.motor_asyncio import AsyncIOMotorClient

    settings = get_settings()
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    if reset:
        print("⚠️  Limpiando base de datos …")
        for col in ["users", "roles", "system_settings"]:
            await db[col].delete_many({})
        print("✅ Base de datos limpia.")

    # ── Roles ──────────────────────────────────────────────────────────────
    print("\n📋 Creando roles …")
    role_ids = {}
    for role in ROLES:
        existing = await db["roles"].find_one({"name": role["name"]})
        if existing:
            await db["roles"].update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "description": role["description"],
                        "permissions": role["permissions"],
                        "is_system": True,
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
            print(f"   ⏭  Rol ya existe: {role['name']}")
            role_ids[role["name"]] = str(existing["_id"])
            continue

        role["created_at"] = datetime.now(UTC)
        role["is_deleted"] = False
        result = await db["roles"].insert_one(role)
        role_ids[role["name"]] = str(result.inserted_id)
        print(f"   ✅ Rol creado: {role['name']}")

    # ── Usuario Admin ──────────────────────────────────────────────────────
    print("\n👤 Creando usuario administrador …")
    existing_admin = await db["users"].find_one({"email": ADMIN_USER["email"]})
    if existing_admin:
        await db["users"].update_one(
            {"_id": existing_admin["_id"]},
            {
                "$set": {
                    "name": ADMIN_USER["full_name"],
                    "full_name": ADMIN_USER["full_name"],
                    "department": "Direccion de Carrera",
                    "role_id": role_ids[ADMIN_USER["role_name"]],
                    "status": "active",
                    "is_active": True,
                    "updated_at": datetime.now(UTC),
                }
            },
        )
        print(f"   ⏭  Admin ya existe: {ADMIN_USER['email']}")
    else:
        admin_doc = {
            "email": ADMIN_USER["email"],
            "name": ADMIN_USER["full_name"],
            "password_hash": hash_password(ADMIN_USER["password"]),
            "role_id": role_ids.get(ADMIN_USER["role_name"]),
            "status": "active",
            "failed_login_attempts": 0,
            "last_login": None,
            "avatar_url": None,
            "preferences": {"language": "es", "theme": "dark"},
            "is_deleted": False,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
        await db["users"].insert_one(admin_doc)
        print(f"   ✅ Admin creado: {ADMIN_USER['email']}")
        print(f"   🔑 Contraseña: {ADMIN_USER['password']}")

    # ── Configuración del sistema ──────────────────────────────────────────
    print("\n⚙️  Cargando configuración inicial …")
    for setting in SYSTEM_SETTINGS:
        await db["system_settings"].update_one(
            {"key": setting["key"]},
            {
                "$set": {**setting, "updated_at": datetime.now(UTC), "updated_by": "seed_script"},
                "$setOnInsert": {"created_at": datetime.now(UTC)},
            },
            upsert=True,
        )
        print(f"   ✅ Setting: {setting['key']} = {setting['value']}")

    # ── Índices ────────────────────────────────────────────────────────────
    print("\n📑 Creando índices adicionales …")
    await db["notifications"].create_index([("user_id", 1), ("is_read", 1)])
    await db["notifications"].create_index([("created_at", -1)])
    await db["workflow_instances"].create_index([("status", 1)])
    await db["workflow_instances"].create_index([("policy_id", 1)])
    await db["agent_history"].create_index([("user_id", 1), ("created_at", -1)])
    await db["system_settings"].create_index([("key", 1)], unique=True)
    print("   ✅ Índices creados")

    client.close()
    print("\n🎉 Seed completado correctamente.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed inicial de EASYDOC")
    parser.add_argument("--reset", action="store_true", help="Limpiar BD antes de insertar")
    args = parser.parse_args()

    asyncio.run(seed(reset=args.reset))
