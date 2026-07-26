import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles: string[] = route.data?.['expectedRoles'] || [];

  if (expectedRoles.length === 0 || authService.hasRole(...expectedRoles)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
