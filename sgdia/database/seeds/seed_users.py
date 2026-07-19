"""
sgdia/database/seeds/seed_users.py

Script de seeding inicial para las colecciones `roles` y `users`.
Crea: 5 roles predefinidos + 1 admin + 5 usuarios de prueba.

Uso:
    python sgdia/database/seeds/seed_users.py

Requisitos:
    pip install beanie motor bcrypt python-dotenv
"""

import asyncio
import os
import sys

import bcrypt
from beanie import init_beanie
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Asegurar que el path de importación funcione
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from app.models.audit_log import AuditLog
from app.models.role import Action, ModulePermission, Role
from app.models.user import User, UserPreferences, UserStatus

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"))

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/sgdia")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "sgdia")


def hash_password(plain: str) -> str:
    """Genera hash bcrypt de la contraseña."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


# ──────────────────────────────────────────────────────────────
# Datos de seed — ROLES
# ──────────────────────────────────────────────────────────────
SEED_ROLES = [
    {
        "name": "Administrador",
        "description": "Acceso total al sistema. Gestiona usuarios, configuración y reportes.",
        "permissions": [
            ModulePermission(module="users",      actions=[Action.READ, Action.WRITE, Action.DELETE, Action.ADMIN]),
            ModulePermission(module="documents",  actions=[Action.READ, Action.WRITE, Action.DELETE, Action.APPROVE, Action.ADMIN]),
            ModulePermission(module="workflows",  actions=[Action.READ, Action.WRITE, Action.DELETE, Action.APPROVE, Action.ADMIN]),
            ModulePermission(module="reports",    actions=[Action.READ, Action.WRITE, Action.DELETE, Action.ADMIN]),
            ModulePermission(module="settings",   actions=[Action.READ, Action.WRITE, Action.ADMIN]),
            ModulePermission(module="audit",      actions=[Action.READ, Action.ADMIN]),
            ModulePermission(module="ai_agent",   actions=[Action.READ, Action.WRITE, Action.ADMIN]),
        ]
    },
    {
        "name": "Analista",
        "description": "Analiza documentos, genera reportes y consulta el agente IA.",
        "permissions": [
            ModulePermission(module="documents",  actions=[Action.READ, Action.WRITE]),
            ModulePermission(module="workflows",  actions=[Action.READ]),
            ModulePermission(module="reports",    actions=[Action.READ, Action.WRITE]),
            ModulePermission(module="audit",      actions=[Action.READ]),
            ModulePermission(module="ai_agent",   actions=[Action.READ, Action.WRITE]),
        ]
    },
    {
        "name": "Gestor",
        "description": "Gestiona flujos de trabajo y aprueba políticas.",
        "permissions": [
            ModulePermission(module="documents",  actions=[Action.READ, Action.WRITE, Action.APPROVE]),
            ModulePermission(module="workflows",  actions=[Action.READ, Action.WRITE, Action.APPROVE]),
            ModulePermission(module="reports",    actions=[Action.READ]),
            ModulePermission(module="ai_agent",   actions=[Action.READ]),
        ]
    },
    {
        "name": "Colaborador",
        "description": "Colabora en documentos y participa en flujos de trabajo asignados.",
        "permissions": [
            ModulePermission(module="documents",  actions=[Action.READ, Action.WRITE]),
            ModulePermission(module="workflows",  actions=[Action.READ, Action.WRITE]),
            ModulePermission(module="ai_agent",   actions=[Action.READ]),
        ]
    },
    {
        "name": "Usuario Final",
        "description": "Acceso de solo lectura. Puede consultar documentos y el agente IA.",
        "permissions": [
            ModulePermission(module="documents",  actions=[Action.READ]),
            ModulePermission(module="workflows",  actions=[Action.READ]),
            ModulePermission(module="ai_agent",   actions=[Action.READ]),
        ]
    },
]


# ──────────────────────────────────────────────────────────────
# Datos de seed — USUARIOS
# ──────────────────────────────────────────────────────────────
SEED_USERS_TEMPLATE = [
    # Admin principal
    {
        "email":      "admin@sgdia.dev",
        "name":       "Administrador Sistema",
        "password":   "Admin@sgdia2026!",
        "role_name":  "Administrador",
        "status":     UserStatus.ACTIVE,
    },
    # Usuarios de prueba
    {
        "email":      "analista1@sgdia.dev",
        "name":       "María Fernández",
        "password":   "Test@1234!",
        "role_name":  "Analista",
        "status":     UserStatus.ACTIVE,
    },
    {
        "email":      "gestor1@sgdia.dev",
        "name":       "Carlos Rodríguez",
        "password":   "Test@1234!",
        "role_name":  "Gestor",
        "status":     UserStatus.ACTIVE,
    },
    {
        "email":      "colaborador1@sgdia.dev",
        "name":       "Ana López",
        "password":   "Test@1234!",
        "role_name":  "Colaborador",
        "status":     UserStatus.ACTIVE,
    },
    {
        "email":      "colaborador2@sgdia.dev",
        "name":       "Luis Mamani",
        "password":   "Test@1234!",
        "role_name":  "Colaborador",
        "status":     UserStatus.ACTIVE,
    },
    {
        "email":      "usuario1@sgdia.dev",
        "name":       "Rosa Quispe",
        "password":   "Test@1234!",
        "role_name":  "Usuario Final",
        "status":     UserStatus.ACTIVE,
    },
]


async def seed_roles() -> dict[str, str]:
    """Crea los roles predefinidos. Retorna mapeo nombre -> id."""
    role_map: dict[str, str] = {}
    for role_data in SEED_ROLES:
        existing = await Role.find_one(Role.name == role_data["name"])
        if existing:
            print(f"  [INFO] Rol ya existe: {role_data['name']}")
            role_map[role_data["name"]] = str(existing.id)
            continue

        role = Role(**role_data)
        await role.insert()
        role_map[role_data["name"]] = str(role.id)
        print(f"  [OK] Rol creado: {role_data['name']}")

    return role_map


async def seed_users(role_map: dict[str, str]) -> None:
    """Crea los usuarios de prueba con sus roles asignados."""
    for user_data in SEED_USERS_TEMPLATE:
        existing = await User.find_one(User.email == user_data["email"])
        if existing:
            print(f"  [INFO] Usuario ya existe: {user_data['email']}")
            continue

        role_id = role_map.get(user_data["role_name"])
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            password_hash=hash_password(user_data["password"]),
            role_id=role_id,
            status=user_data["status"],
            preferences=UserPreferences(),
        )
        await user.insert()
        print(f"  [OK] Usuario creado: {user_data['email']} ({user_data['role_name']})")


async def main() -> None:
    print("Iniciando seed de la base de datos EASYDOC...")
    print(f"   Conectando a: {MONGODB_URL[:50]}...")

    client = AsyncIOMotorClient(MONGODB_URL)
    await init_beanie(
        database=client[MONGODB_DB_NAME],
        document_models=[Role, User, AuditLog]
    )

    print("\nCreando roles...")
    role_map = await seed_roles()

    print("\nCreando usuarios...")
    await seed_users(role_map)

    print(f"\nSeed completado. Roles: {len(SEED_ROLES)}, Usuarios: {len(SEED_USERS_TEMPLATE)}")
    print("\nCredenciales de acceso:")
    print("   Admin: admin@sgdia.dev / Admin@sgdia2026!")
    print("   Test:  *@sgdia.dev     / Test@1234!")


if __name__ == "__main__":
    asyncio.run(main())
