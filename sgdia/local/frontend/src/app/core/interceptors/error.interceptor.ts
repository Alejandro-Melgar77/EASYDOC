import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Retry a protected request once after the API refreshes its expired JWT.
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access_token}`,
              },
            });
            return next(retryReq);
          }),
          catchError((err) => {
            // If refresh fails, authService.refreshToken already handles clearing session/redirecting
            return throwError(() => err);
          }),
        );
      }

      // Format custom error message to bubble up to components
      const errorMessage =
        error.error?.error?.message ||
        error.error?.detail ||
        error.error?.message ||
        error.statusText ||
        'Error de conexión con el servidor';
      return throwError(() => new Error(errorMessage));
    }),
  );
};
