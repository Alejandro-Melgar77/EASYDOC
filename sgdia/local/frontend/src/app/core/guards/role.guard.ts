import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Read required roles from the route configuration data
  const requiredRoles = route.data?.['roles'] as string[];

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  if (authService.isAuthenticated() && authService.hasRole(requiredRoles)) {
    return true;
  }

  // Not authorized, redirect to dashboard or home
  router.navigate(['/dashboard']);
  return false;
};
