export type UserRole = 'owner' | 'admin' | 'viewer';

export const VALID_ROLES: UserRole[] = ['owner', 'admin', 'viewer'];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 3,
  admin: 2,
  viewer: 1,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
