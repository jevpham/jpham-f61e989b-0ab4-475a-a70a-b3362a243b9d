import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { UserRole, hasMinimumRole, CreateOrganizationDto, AddMemberDto } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
// DTOs are now interfaces - validation happens in controller via ValidationPipe

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organizationRepository.findOne({ where: { slug } });
  }

  async create(dto: CreateOrganizationDto, ownerId: string): Promise<Organization> {
    const existing = await this.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    if (dto.parentId) {
      const parent = await this.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent organization not found');
      }
      // Only allow 2-level hierarchy
      if (parent.parentId !== null) {
        throw new ForbiddenException('Cannot create sub-organization of a sub-organization');
      }
    }

    // Use transaction to ensure atomicity
    return this.dataSource.transaction(async (manager) => {
      const org = manager.create(Organization, {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
      });

      const savedOrg = await manager.save(org);

      // Add creator as owner within the same transaction
      const membership = manager.create(OrganizationMembership, {
        userId: ownerId,
        organizationId: savedOrg.id,
        role: 'owner' as UserRole,
      });
      await manager.save(membership);

      return savedOrg;
    });
  }

  async addMember(organizationId: string, dto: AddMemberDto): Promise<OrganizationMembership> {
    const org = await this.findById(organizationId);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const existing = await this.membershipRepository.findOne({
      where: { userId: dto.userId, organizationId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const membership = this.membershipRepository.create({
      userId: dto.userId,
      organizationId,
      role: dto.role ?? 'viewer',
    });

    return this.membershipRepository.save(membership);
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Prevent removing the last owner
    if (membership.role === 'owner') {
      const ownerCount = await this.membershipRepository.count({
        where: { organizationId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner of the organization');
      }
    }

    await this.membershipRepository.remove(membership);
  }

  async updateMemberRole(organizationId: string, userId: string, role: UserRole): Promise<OrganizationMembership> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Prevent downgrading the last owner
    if (membership.role === 'owner' && role !== 'owner') {
      const ownerCount = await this.membershipRepository.count({
        where: { organizationId, role: 'owner' },
      });
      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot downgrade the last owner of the organization');
      }
    }

    membership.role = role;
    return this.membershipRepository.save(membership);
  }

  async getMembership(userId: string, organizationId: string): Promise<OrganizationMembership | null> {
    return this.membershipRepository.findOne({
      where: { userId, organizationId },
    });
  }

  async getUserRole(userId: string, organizationId: string): Promise<UserRole | null> {
    const membership = await this.getMembership(userId, organizationId);
    return membership?.role ?? null;
  }

  async isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.getMembership(userId, organizationId);
    return !!membership;
  }

  async hasPermission(userId: string, organizationId: string, requiredRole: UserRole): Promise<boolean> {
    const userRole = await this.getUserRole(userId, organizationId);
    if (!userRole) {
      return false;
    }
    return hasMinimumRole(userRole, requiredRole);
  }

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMembership[]> {
    return this.membershipRepository.find({
      where: { organizationId },
      relations: ['user'],
    });
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMembership[]> {
    return this.membershipRepository.find({
      where: { userId },
      relations: ['organization'],
    });
  }
}
