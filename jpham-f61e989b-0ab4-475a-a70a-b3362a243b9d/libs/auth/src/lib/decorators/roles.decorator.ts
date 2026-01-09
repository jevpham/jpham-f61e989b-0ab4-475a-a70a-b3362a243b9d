import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
