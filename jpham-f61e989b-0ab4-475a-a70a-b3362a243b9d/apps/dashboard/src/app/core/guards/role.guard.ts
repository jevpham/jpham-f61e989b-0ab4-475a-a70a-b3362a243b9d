import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthStore } from '../../store/auth/auth.store';
import { UserRole, hasMinimumRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const requiredRole = route.data['role'] as UserRole | undefined;
  if (!requiredRole) {
    return true;
  }

  const userRole = authStore.userRole();
  if (!userRole) {
    router.navigate(['/login']);
    return false;
  }

  if (hasMinimumRole(userRole, requiredRole)) {
    return true;
  }

  // Redirect to dashboard if user doesn't have required role
  router.navigate(['/dashboard']);
  return false;
};
