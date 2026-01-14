import {
  Controller,
  Get,
  Param,
  Query,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditService, AuditLogFilters } from './audit.service';
import { AuditLogQueryDto, AuditLogUserQueryDto } from './dto/audit-log-query.dto';
import { CurrentUser, Roles } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { IUser, IAuditLog } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { OrganizationsService } from '../organizations/organizations.service';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get audit logs', description: 'Get audit logs for the current organization (Admin+ only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin role required' })
  async findAll(
    @CurrentUser() user: IUser,
    @Query() query: AuditLogQueryDto,
  ): Promise<{ data: IAuditLog[]; total: number; page: number; limit: number }> {
    const targetOrganizationId = query.organizationId ?? user.organizationId;

    if (!targetOrganizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    const hasPermission = await this.organizationsService.hasPermission(
      user.id,
      targetOrganizationId,
      'admin',
    );

    if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    const filters: Omit<AuditLogFilters, 'organizationId'> = {};
    if (query.userId) filters.userId = query.userId;
    if (query.action) filters.action = query.action;
    if (query.resource) filters.resource = query.resource;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const result = await this.auditService.findByOrganization(
      targetOrganizationId,
      filters,
      page,
      limit,
    );

    return { ...result, page, limit };
  }

  @Get('organization/:orgId')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get organization audit logs', description: 'Get audit logs for an organization (Admin+ only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 400, description: 'Invalid organization ID or query parameters' })
  @ApiResponse({ status: 403, description: 'Access denied - Admin role required' })
  async findByOrganization(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: IUser,
    @Query() query: AuditLogUserQueryDto,
  ): Promise<{ data: IAuditLog[]; total: number }> {
    const hasPermission = await this.organizationsService.hasPermission(
      user.id,
      orgId,
      'admin',
    );

    if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    const filters: Omit<AuditLogFilters, 'organizationId'> = {};
    if (query.action) filters.action = query.action;
    if (query.resource) filters.resource = query.resource;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.auditService.findByOrganization(
      orgId,
      filters,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Get('user/:userId')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Get user audit logs', description: 'Get audit logs for a specific user (Admin+ only, or own logs)' })
  @ApiParam({ name: 'userId', description: 'User ID to get logs for' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 400, description: 'Invalid user ID or query parameters' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: IUser,
    @Query() query: AuditLogUserQueryDto,
  ): Promise<{ data: IAuditLog[]; total: number }> {
    // Users can only view their own logs, or admins can view any user in their org
    if (userId !== user.id) {
      // Check if requesting user is admin of an org that target user belongs to
      if (query.organizationId) {
        const hasPermission = await this.organizationsService.hasPermission(
          user.id,
          query.organizationId,
          'admin',
        );
        if (!hasPermission) {
          throw new ForbiddenException('Access denied');
        }
        const targetUserBelongsToOrg =
          await this.organizationsService.isUserInOrganization(
            userId,
            query.organizationId,
          );
        if (!targetUserBelongsToOrg) {
          throw new ForbiddenException(
            'User does not belong to the specified organization',
          );
        }
      } else {
        // Must specify organizationId when querying other users' logs
        throw new ForbiddenException('organizationId is required when viewing other users\' logs');
      }
    }

    const filters: Omit<AuditLogFilters, 'userId'> = {};
    if (query.organizationId) filters.organizationId = query.organizationId;
    if (query.action) filters.action = query.action;
    if (query.resource) filters.resource = query.resource;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.auditService.findByUser(
      userId,
      filters,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my audit logs', description: 'Get audit logs for the current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns paginated audit logs' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async findMyLogs(
    @CurrentUser() user: IUser,
    @Query() query: AuditLogUserQueryDto,
  ): Promise<{ data: IAuditLog[]; total: number }> {
    const filters: Omit<AuditLogFilters, 'userId'> = {};
    if (query.action) filters.action = query.action;
    if (query.resource) filters.resource = query.resource;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    return this.auditService.findByUser(
      user.id,
      filters,
      query.page ?? 1,
      query.limit ?? 50,
    );
  }
}
