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

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({ description: 'User ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Action type to filter by',
    enum: ['create', 'update', 'delete', 'login', 'logout', 'register', 'status_change', 'role_change', 'reorder', 'read', 'access_denied'],
  })
  @IsOptional()
  @IsEnum(['create', 'update', 'delete', 'login', 'logout', 'register', 'status_change', 'role_change', 'reorder', 'read', 'access_denied'], {
    message: 'action must be a valid audit action type',
  })
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

export class AuditLogUserQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID to filter by' })
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Action type to filter by',
    enum: ['create', 'update', 'delete', 'login', 'logout', 'register', 'status_change', 'role_change', 'reorder', 'read', 'access_denied'],
  })
  @IsOptional()
  @IsEnum(['create', 'update', 'delete', 'login', 'logout', 'register', 'status_change', 'role_change', 'reorder', 'read', 'access_denied'], {
    message: 'action must be a valid audit action type',
  })
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Resource type to filter by' })
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
