import { UserRole } from '../enums/role.enum';

// Plain interfaces for frontend compatibility
// Backend validates via ValidationPipe with class-validator

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
}

export interface AddMemberDto {
  userId: string;
  role?: UserRole;
}

export interface UpdateMemberRoleDto {
  role: UserRole;
}
