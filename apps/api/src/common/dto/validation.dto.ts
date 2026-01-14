import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches, IsIn, IsUUID, IsDateString, Min, Max, IsInt, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskCategory, UserRole, VALID_ROLES } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// Password complexity regex - reused across DTOs for consistency
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/;

// =============================================================================
// Auth DTOs
// =============================================================================

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  organizationName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Organization slug must be lowercase alphanumeric with hyphens' })
  organizationSlug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  organizationDescription?: string;
}

// =============================================================================
// Task DTOs
// =============================================================================

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: TaskPriority;

  @IsIn(['work', 'personal', 'shopping', 'health', 'other'])
  @IsOptional()
  category?: TaskCategory;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ValidateIf((o) => o.description !== null)
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string | null;

  @IsIn(['todo', 'in_progress', 'review', 'done'])
  @IsOptional()
  status?: TaskStatus;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: TaskPriority;

  @IsIn(['work', 'personal', 'shopping', 'health', 'other'])
  @IsOptional()
  category?: TaskCategory;

  @ValidateIf((o) => o.dueDate !== null)
  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @ValidateIf((o) => o.assigneeId !== null)
  @IsUUID()
  @IsOptional()
  assigneeId?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;
}

export class ReorderTaskDto {
  @IsInt()
  @Min(0)
  newPosition!: number;
}

// =============================================================================
// Organization DTOs
// =============================================================================

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class AddMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(VALID_ROLES, { message: `Role must be one of: ${VALID_ROLES.join(', ')}` })
  @IsOptional()
  role?: UserRole;
}

export class UpdateMemberRoleDto {
  @IsIn(VALID_ROLES, { message: `Role must be one of: ${VALID_ROLES.join(', ')}` })
  role!: UserRole;
}

// =============================================================================
// User DTOs
// =============================================================================

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsUUID()
  organizationId!: string;

  @IsIn(VALID_ROLES, { message: `Role must be one of: ${VALID_ROLES.join(', ')}` })
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsIn(VALID_ROLES, { message: `Role must be one of: ${VALID_ROLES.join(', ')}` })
  @IsOptional()
  role?: UserRole;
}

// =============================================================================
// Pagination DTOs
// =============================================================================

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

// =============================================================================
// Task Filter DTOs
// =============================================================================

export class TaskFilterDto {
  @IsOptional()
  @IsIn(['todo', 'in_progress', 'review', 'done'])
  status?: TaskStatus;

  @IsOptional()
  @IsIn(['work', 'personal', 'shopping', 'health', 'other'])
  category?: TaskCategory;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;
}
