from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.ip_address = self._get_client_ip(request)
        request.state.user_agent = request.headers.get("user-agent", "unknown")
        response = await call_next(request)
        return response

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # return first ip in the list
            return x_forwarded_for.split(",")[0].strip()
        x_real_ip = request.headers.get("X-Real-IP")
        if x_real_ip:
            return x_real_ip

        return request.client.host if request.client else "127.0.0.1"
