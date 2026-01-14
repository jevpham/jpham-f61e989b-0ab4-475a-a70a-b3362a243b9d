import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, hasMinimumRole, VALID_ROLES } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Explicit validation: user must exist with a valid role
    if (!user || !user.role || !VALID_ROLES.includes(user.role)) {
      return false;
    }

    return requiredRoles.some((role) => hasMinimumRole(user.role, role));
  }
}
