import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches, IsIn, IsUUID, IsDateString, IsNumber, Min, Max, IsInt, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskCategory, UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// =============================================================================
// Auth DTOs
// =============================================================================

export class LoginDtoValidation {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class RegisterDtoValidation {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
    { message: 'Password must contain uppercase, lowercase, number, and special character' }
  )
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

export class CreateTaskDtoValidation {
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

export class UpdateTaskDtoValidation {
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
}

export class ReorderTaskDtoValidation {
  @IsNumber()
  @Min(0)
  newPosition!: number;
}

// =============================================================================
// Organization DTOs
// =============================================================================

export class CreateOrganizationDtoValidation {
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
  @MaxLength(500)
  description?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class AddMemberDtoValidation {
  @IsUUID()
  userId!: string;

  @IsString()
  @IsOptional()
  @Matches(/^(owner|admin|viewer)$/, { message: 'Role must be owner, admin, or viewer' })
  role?: UserRole;
}

export class UpdateMemberRoleDtoValidation {
  @IsString()
  @Matches(/^(owner|admin|viewer)$/, { message: 'Role must be owner, admin, or viewer' })
  role!: UserRole;
}

// =============================================================================
// User DTOs
// =============================================================================

export class CreateUserDtoValidation {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  organizationId!: string;

  @IsIn(['owner', 'admin', 'viewer'])
  @IsOptional()
  role?: UserRole;
}

export class UpdateUserDtoValidation {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsIn(['owner', 'admin', 'viewer'])
  @IsOptional()
  role?: UserRole;
}

// =============================================================================
// Pagination DTOs
// =============================================================================

export class PaginationDtoValidation {
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

export class TaskFilterDtoValidation {
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
