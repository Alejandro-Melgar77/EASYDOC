"""
Tarea 8.1 — Servicio de notificaciones multi-canal.

Canales soportados:
  • in_app  → persiste en MongoDB + push por WebSocket (ver ws_notifications.py)
  • email   → SMTP/SES vía aiosmtplib (async)
  • push    → Firebase Cloud Messaging (placeholder)
"""

import logging
import smtplib
from datetime import UTC, datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings
from app.core.database import get_database

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.settings = get_settings()

    # ── Canal: in-app ────────────────────────────────────────────────────────

    async def send_in_app(
        self,
        user_id: str,
        title: str,
        body: str,
        notif_type: str = "info",
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> dict:
        """Persiste la notificación en MongoDB para ser leída por WebSocket o polling."""
        db = get_database()
        notif = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "type": notif_type,
            "channel": "in_app",
            "is_read": False,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "created_at": datetime.now(UTC),
        }
        result = await db["notifications"].insert_one(notif)
        notif["id"] = str(result.inserted_id)
        from app.routers.ws_notifications import notification_manager

        await notification_manager.push_to_user(user_id, notif)
        logger.info("In-app notification sent to user %s: %s", user_id, title)
        return notif

    # ── Canal: email ─────────────────────────────────────────────────────────

    async def send_email(
        self,
        to_address: str,
        subject: str,
        html_body: str,
    ) -> bool:
        """Envía un email vía SMTP sincrónico (en producción usar aiosmtplib)."""
        host = self.settings.SMTP_HOST
        port = self.settings.SMTP_PORT
        user = self.settings.SMTP_USER
        password = self.settings.SMTP_PASSWORD

        if not host or not user:
            logger.warning("SMTP not configured — skipping email to %s", to_address)
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = user
            msg["To"] = to_address
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(user, to_address, msg.as_string())

            logger.info("Email sent to %s: %s", to_address, subject)
            return True
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", to_address, exc)
            return False

    # ── Canal: push (Firebase FCM) ───────────────────────────────────────────

    async def send_push(self, device_token: str, title: str, body: str) -> bool:
        """Placeholder para Firebase Cloud Messaging."""
        logger.info("Push notification (mock) to token %s: %s", device_token[:10], title)
        # TODO: integrar con firebase-admin SDK
        return True

    # ── Helpers compuestos ───────────────────────────────────────────────────

    async def notify_user(
        self,
        user_id: str,
        title: str,
        body: str,
        notif_type: str = "info",
        channels: list[str] = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        """Envia por todos los canales solicitados."""
        channels = channels or ["in_app"]

        if "in_app" in channels:
            await self.send_in_app(user_id, title, body, notif_type, entity_type, entity_id)

        if "email" in channels:
            db = get_database()
            user = await db["users"].find_one({"_id": user_id})
            if user and user.get("email"):
                await self.send_email(
                    to_address=user["email"],
                    subject=title,
                    html_body=f"<p>{body}</p>",
                )
