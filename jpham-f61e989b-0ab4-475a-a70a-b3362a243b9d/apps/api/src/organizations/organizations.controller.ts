import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser, Roles } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import { IUser, IOrganization, UserRole, CreateOrganizationDto, AddMemberDto } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { Organization } from './entities/organization.entity';

const VALID_ROLES: UserRole[] = ['owner', 'admin', 'viewer'];

@ApiTags('organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization', description: 'Create a new organization (user becomes owner)' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: IUser,
  ): Promise<IOrganization> {
    const org = await this.organizationsService.create(dto, user.id);
    return this.toResponse(org);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization', description: 'Get organization details by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Returns organization details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ): Promise<IOrganization> {
    const membership = await this.organizationsService.getMembership(user.id, id);
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    const org = await this.organizationsService.findById(id);
    if (!org) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponse(org);
  }

  @Post(':id/members')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Add member', description: 'Add a user to the organization (Admin+ only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async addMember(
    @Param('id') organizationId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: IUser,
  ): Promise<{ message: string }> {
    const hasPermission = await this.organizationsService.hasPermission(user.id, organizationId, 'admin');
    if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    await this.organizationsService.addMember(organizationId, dto);
    return { message: 'Member added successfully' };
  }

  @Put(':id/members/:userId/role')
  @Roles('owner')
  @ApiOperation({ summary: 'Update member role', description: 'Change a member\'s role (Owner only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiBody({ schema: { properties: { role: { enum: ['owner', 'admin', 'viewer'] } } } })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid role' })
  @ApiResponse({ status: 403, description: 'Access denied or cannot modify own role' })
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @CurrentUser() user: IUser,
  ): Promise<{ message: string }> {
    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      throw new BadRequestException('Invalid role. Must be one of: owner, admin, viewer');
    }

    // Prevent self-modification
    if (userId === user.id) {
      throw new ForbiddenException('Cannot modify your own role');
    }

    const hasPermission = await this.organizationsService.hasPermission(user.id, organizationId, 'owner');
    if (!hasPermission) {
      throw new ForbiddenException('Only owners can change member roles');
    }

    await this.organizationsService.updateMemberRole(organizationId, userId, role);
    return { message: 'Member role updated successfully' };
  }

  @Delete(':id/members/:userId')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member', description: 'Remove a user from the organization (Admin+ only)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 204, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Access denied or cannot remove yourself' })
  async removeMember(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    // Prevent self-removal
    if (userId === user.id) {
      throw new ForbiddenException('Cannot remove yourself from the organization');
    }

    const hasPermission = await this.organizationsService.hasPermission(user.id, organizationId, 'admin');
    if (!hasPermission) {
      throw new ForbiddenException('Access denied');
    }

    await this.organizationsService.removeMember(organizationId, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members', description: 'Get all members of an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Returns list of organization members' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getMembers(
    @Param('id') organizationId: string,
    @CurrentUser() user: IUser,
  ) {
    const membership = await this.organizationsService.getMembership(user.id, organizationId);
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return this.organizationsService.getOrganizationMembers(organizationId);
  }

  @Get('user/memberships')
  @ApiOperation({ summary: 'List user organizations', description: 'Get all organizations the current user belongs to' })
  @ApiResponse({ status: 200, description: 'Returns list of user\'s organization memberships' })
  async getUserOrganizations(@CurrentUser() user: IUser) {
    return this.organizationsService.getUserOrganizations(user.id);
  }

  private toResponse(org: Organization): IOrganization {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      parentId: org.parentId,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
