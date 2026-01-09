import {
  Controller,
  Get,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService, AuditLogFilters } from './audit.service';
import { CurrentUser, Roles } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { IUser, IAuditLog, AuditAction } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { OrganizationsService } from '../organizations/organizations.service';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('organization/:orgId')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get organization audit logs', description: 'Get audit logs for an organization (Admin+ only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'login', 'logout', 'status_change', 'role_change', 'reorder'] })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource type (task, organization, user)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin role required' })
  async findByOrganization(
    @Param('orgId') orgId: string,
    @CurrentUser() user: IUser,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ): Promise<{ data: IAuditLog[]; total: number }> {
    // Verify user has admin access to organization
    const hasPermission = await this.organizationsService.hasPermission(
      user.id,
      orgId,
      'admin',
    );

    if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    const filters: Omit<AuditLogFilters, 'organizationId'> = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditService.findByOrganization(
      orgId,
      filters,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 100), // Cap at 100
    );
  }

  @Get('user/:userId')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get user audit logs', description: 'Get audit logs for a specific user (Admin+ only, or own logs)' })
  @ApiParam({ name: 'userId', description: 'User ID to get logs for' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'login', 'logout', 'status_change', 'role_change', 'reorder'] })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findByUser(
    @Param('userId') userId: string,
    @CurrentUser() user: IUser,
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ): Promise<{ data: IAuditLog[]; total: number }> {
    // Users can only view their own logs, or admins can view any user in their org
    if (userId !== user.id) {
      // Check if requesting user is admin of an org that target user belongs to
      if (organizationId) {
        const hasPermission = await this.organizationsService.hasPermission(
          user.id,
          organizationId,
          'admin',
        );
        if (!hasPermission) {
          throw new ForbiddenException('Access denied');
        }
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    const filters: Omit<AuditLogFilters, 'userId'> = {};
    if (organizationId) filters.organizationId = organizationId;
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditService.findByUser(
      userId,
      filters,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 100),
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my audit logs', description: 'Get audit logs for the current authenticated user' })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'login', 'logout', 'status_change', 'role_change', 'reorder'] })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO 8601)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  async findMyLogs(
    @CurrentUser() user: IUser,
    @Query('action') action?: AuditAction,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ): Promise<{ data: IAuditLog[]; total: number }> {
    const filters: Omit<AuditLogFilters, 'userId'> = {};
    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.auditService.findByUser(
      user.id,
      filters,
      parseInt(page, 10),
      Math.min(parseInt(limit, 10), 100),
    );
  }
}
