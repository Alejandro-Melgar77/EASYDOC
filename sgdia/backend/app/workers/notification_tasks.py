"""
Tarea Celery para enviar notificaciones de forma asíncrona.
Las notificaciones de email y push se delegan aquí para no bloquear
los workers de la API.
"""

import asyncio
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="notifications.send_email", queue="default")
def send_email_task(to_address: str, subject: str, html_body: str):
    """Envía un email de forma asíncrona via Celery."""

    async def _run():
        from app.services.notification_service import NotificationService

        svc = NotificationService()
        await svc.send_email(to_address, subject, html_body)

    asyncio.run(_run())
    return {"status": "sent", "to": to_address}


@shared_task(name="notifications.send_push", queue="default")
def send_push_task(device_token: str, title: str, body: str):
    """Envía push notification via Firebase de forma asíncrona."""

    async def _run():
        from app.services.notification_service import NotificationService

        svc = NotificationService()
        await svc.send_push(device_token, title, body)

    asyncio.run(_run())
    return {"status": "sent", "token": device_token[:10] + "..."}


@shared_task(name="notifications.broadcast_to_user", queue="default")
def broadcast_notification_to_user(user_id: str, title: str, body: str, notif_type: str = "info"):
    """
    Crea notificación in-app en MongoDB y la pushea via WebSocket
    si el usuario tiene sesión activa.
    """

    async def _run():
        from app.services.notification_service import NotificationService

        svc = NotificationService()
        notif = await svc.send_in_app(user_id, title, body, notif_type)

        # Push por WebSocket si hay conexión activa
        try:
            from app.routers.ws_notifications import notification_manager

            await notification_manager.push_to_user(
                user_id,
                {
                    "type": "notification",
                    "data": notif,
                },
            )
        except Exception as exc:
            logger.warning("WS push failed for user %s: %s", user_id, exc)

    asyncio.run(_run())
    return {"status": "ok", "user_id": user_id}
