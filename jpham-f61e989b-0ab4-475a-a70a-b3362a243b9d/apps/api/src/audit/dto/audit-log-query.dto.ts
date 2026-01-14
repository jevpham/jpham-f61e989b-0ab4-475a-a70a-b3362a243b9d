import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// Valid audit actions for validation - must match AuditAction type exactly
const VALID_ACTIONS = [
  'create', 'read', 'update', 'delete', 'login', 'login_failed',
  'logout', 'register', 'access_denied', 'status_change', 'reorder',
] as const;

/**
 * Base class for audit log query parameters.
 * Contains common fields shared by all audit log queries.
 */
abstract class BaseAuditQueryDto {
  @ApiPropertyOptional({
    description: 'Action type to filter by',
    enum: VALID_ACTIONS,
  })
  @IsOptional()
  @IsEnum(VALID_ACTIONS, { message: 'action must be a valid audit action type' })
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Resource type to filter by (tasks, organizations, auth)' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601 format)' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601 format)' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 50, max: 100)', minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  limit?: number = 50;
}

/**
 * Query DTO for admin audit log queries (can filter by userId).
 */
export class AuditLogQueryDto extends BaseAuditQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({ description: 'User ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;
}

/**
 * Query DTO for user audit log queries (cannot filter by userId - only sees own logs).
 */
export class AuditLogUserQueryDto extends BaseAuditQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;
}
