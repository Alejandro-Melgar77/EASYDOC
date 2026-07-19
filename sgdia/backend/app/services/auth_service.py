from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.database import get_database
from app.core.redis import add_to_blacklist, get_redis, is_blacklisted
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_jwt,
    hash_password,
    verify_password,
)
from app.schemas.auth import RegisterRequest, TokenResponse
from app.services.audit_service import AuditService


class AuthService:
    @staticmethod
    def _role_permissions(role: dict[str, Any] | None) -> list[str]:
        """Normalize current and legacy role permission documents for JWT claims."""
        if role is None:
            return []

        permissions = role.get("permissions", [])
        if all(isinstance(permission, str) for permission in permissions):
            return list(permissions)

        normalized: list[str] = []
        for permission in permissions:
            if not isinstance(permission, dict):
                continue
            module = permission.get("module")
            actions = permission.get("actions", [])
            if not isinstance(module, str) or not isinstance(actions, list):
                continue
            normalized.extend(f"{module}:{action}" for action in actions if isinstance(action, str))
        return normalized

    @staticmethod
    async def _role_for_user(user: dict[str, Any]) -> dict[str, Any] | None:
        """Load a role only when the persisted identifier is a valid ObjectId."""
        role_id = user.get("role_id")
        if not isinstance(role_id, str) or not ObjectId.is_valid(role_id):
            return None
        return await get_database()["roles"].find_one({"_id": ObjectId(role_id)})

    @staticmethod
    async def register_user(
        data: RegisterRequest, created_by: str | None = None, ip_address: str | None = None
    ) -> dict:
        """CU-01: Solo admin crea usuarios"""
        db = get_database()
        users_col = db["users"]

        # Check if email already exists
        existing_user = await users_col.find_one({"email": data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
            )

        hashed_password = hash_password(data.password)

        now = datetime.now(UTC)
        user_doc = {
            "email": data.email,
            "name": data.full_name,
            "password_hash": hashed_password,
            "role_id": data.role_id,
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }

        result = await users_col.insert_one(user_doc)
        user_id = str(result.inserted_id)
        role = await AuthService._role_for_user(user_doc)

        # Log action
        await AuditService.log_action(
            user_id=created_by,
            action=AuditService.ACTIONS["REGISTER"],
            entity_type="user",
            entity_id=user_id,
            ip_address=ip_address,
        )

        return {
            "id": user_id,
            "email": data.email,
            "full_name": data.full_name,
            "role": role.get("name") if role else None,
            "is_active": True,
            "created_at": now,
        }

    @staticmethod
    async def authenticate(
        email: str, password: str, ip_address: str | None = None
    ) -> TokenResponse:
        """CU-02: Login with rate limiting and lockout"""
        settings = get_settings()
        db = get_database()
        users_col = db["users"]
        redis = get_redis()

        # Check lockout
        lockout_key = f"sgdia:lockout:{email}"
        is_locked = await redis.get(lockout_key)
        if is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Account locked. Try again later."
            )

        user = await users_col.find_one({"email": email})

        attempts_key = f"sgdia:login_attempts:{email}"
        attempts = await redis.get(attempts_key)
        attempts = int(attempts) if attempts else 0

        password_hash = (user or {}).get("hashed_password") or (user or {}).get("password_hash")
        if not user or not password_hash or not verify_password(password, password_hash):
            attempts += 1
            if attempts >= settings.MAX_LOGIN_ATTEMPTS:
                await redis.setex(lockout_key, settings.LOGIN_LOCKOUT_MINUTES * 60, "1")
                await AuditService.log_action(
                    user_id=str(user["_id"]) if user else None,
                    action=AuditService.ACTIONS["ACCOUNT_LOCKED"],
                    entity_type="user",
                    entity_id=str(user["_id"]) if user else email,
                    ip_address=ip_address,
                )
            else:
                await redis.setex(attempts_key, 3600, attempts)

            await AuditService.log_action(
                user_id=str(user["_id"]) if user else None,
                action=AuditService.ACTIONS["LOGIN_FAILED"],
                entity_type="user",
                entity_id=str(user["_id"]) if user else email,
                ip_address=ip_address,
            )

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
            )

        if not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

        # Reset attempts
        await redis.delete(attempts_key)

        # Get role details for permissions.
        role = await AuthService._role_for_user(user)

        # Generate tokens
        token_data = {
            "sub": str(user["_id"]),
            "role": role["name"] if role else "user",
            "roles": [role["name"]] if role else ["user"],
            "permissions": AuthService._role_permissions(role),
            "is_active": user.get("is_active", user.get("status") == "active"),
            "email": user["email"],
            "name": user.get("name", user.get("full_name", user["email"])),
        }

        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data={"sub": str(user["_id"])})

        await AuditService.log_action(
            user_id=str(user["_id"]),
            action=AuditService.ACTIONS["LOGIN"],
            entity_type="user",
            entity_id=str(user["_id"]),
            ip_address=ip_address,
        )

        return TokenResponse(
            access_token=access_token, refresh_token=refresh_token, token_type="bearer"
        )

    @staticmethod
    async def logout(token: str, user_id: str | None = None, ip_address: str | None = None) -> None:
        """CU-04: Blacklist JWT in Redis"""
        try:
            payload = decode_jwt(token)
            exp = payload.get("exp")
            if exp:
                now = int(datetime.now(UTC).timestamp())
                ttl = exp - now
                if ttl > 0:
                    await add_to_blacklist(token, ttl)

            if user_id:
                await AuditService.log_action(
                    user_id=user_id,
                    action=AuditService.ACTIONS["LOGOUT"],
                    entity_type="user",
                    entity_id=user_id,
                    ip_address=ip_address,
                )
        except Exception:
            pass

    @staticmethod
    async def refresh_token(refresh_token: str) -> TokenResponse:
        """Renew access token with valid refresh token"""
        if await is_blacklisted(refresh_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token blacklisted"
            )

        payload = decode_jwt(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload"
            )

        db = get_database()
        users_col = db["users"]
        user = await users_col.find_one({"_id": ObjectId(user_id)})

        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive"
            )

        role = await AuthService._role_for_user(user)

        token_data = {
            "sub": str(user["_id"]),
            "role": role["name"] if role else "user",
            "roles": [role["name"]] if role else ["user"],
            "permissions": AuthService._role_permissions(role),
            "is_active": user.get("is_active", user.get("status") == "active"),
            "email": user["email"],
            "name": user.get("name", user.get("full_name", user["email"])),
        }

        new_access = create_access_token(data=token_data)
        new_refresh = create_refresh_token(data={"sub": str(user["_id"])})

        # Blacklist old refresh token
        exp = payload.get("exp")
        if exp:
            now = int(datetime.now(UTC).timestamp())
            ttl = exp - now
            if ttl > 0:
                await add_to_blacklist(refresh_token, ttl)

        return TokenResponse(
            access_token=new_access, refresh_token=new_refresh, token_type="bearer"
        )
