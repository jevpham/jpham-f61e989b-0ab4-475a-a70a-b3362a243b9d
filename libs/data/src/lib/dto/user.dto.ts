import { UserRole } from '../enums/role.enum';

// Plain interfaces for frontend compatibility
// Backend validates via ValidationPipe with class-validator

export interface CreateUserDto {
  email: string;
  password: string;
  organizationId: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  role?: UserRole;
}
