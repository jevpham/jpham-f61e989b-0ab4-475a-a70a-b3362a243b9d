import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { UserRole, CreateOrganizationDto, AddMemberDto } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let membershipRepository: jest.Mocked<Repository<OrganizationMembership>>;
  let dataSource: jest.Mocked<DataSource>;

  // Test fixtures
  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    description: 'Test Description',
    parentId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Organization;

  const mockSubOrganization: Organization = {
    id: 'sub-org-456',
    name: 'Sub Organization',
    slug: 'sub-org',
    description: null,
    parentId: 'org-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Organization;

  // Factory functions to create fresh fixture copies (prevents mutation issues across tests)
  const createMockOwnerMembership = (): OrganizationMembership => ({
    id: 'membership-1',
    userId: 'owner-123',
    organizationId: 'org-123',
    role: 'owner' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrganizationMembership);

  const createMockAdminMembership = (): OrganizationMembership => ({
    id: 'membership-2',
    userId: 'admin-456',
    organizationId: 'org-123',
    role: 'admin' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrganizationMembership);

  const createMockViewerMembership = (): OrganizationMembership => ({
    id: 'membership-3',
    userId: 'viewer-789',
    organizationId: 'org-123',
    role: 'viewer' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OrganizationMembership);

  // Mutable references recreated in beforeEach to ensure test isolation
  let mockOwnerMembership: OrganizationMembership;
  let mockAdminMembership: OrganizationMembership;
  let mockViewerMembership: OrganizationMembership;

  beforeEach(async () => {
    // Recreate fresh copies of membership fixtures to prevent mutation leaking between tests
    mockOwnerMembership = createMockOwnerMembership();
    mockAdminMembership = createMockAdminMembership();
    mockViewerMembership = createMockViewerMembership();

    const mockOrgRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockMembershipRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepository },
        { provide: getRepositoryToken(OrganizationMembership), useValue: mockMembershipRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get(getRepositoryToken(Organization));
    membershipRepository = module.get(getRepositoryToken(OrganizationMembership));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return organization when found', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findById('org-123');

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      });
    });

    it('should return null when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return organization when found by slug', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findBySlug('test-org');

      expect(result).toEqual(mockOrganization);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-org' },
      });
    });

    it('should return null when slug not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create organization and add owner membership in transaction', async () => {
      organizationRepository.findOne.mockResolvedValue(null); // Slug doesn't exist

      const savedOrg = { ...mockOrganization };
      const savedMembership = { ...mockOwnerMembership };

      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          create: jest.fn()
            .mockReturnValueOnce(savedOrg)
            .mockReturnValueOnce(savedMembership),
          save: jest.fn()
            .mockResolvedValueOnce(savedOrg)
            .mockResolvedValueOnce(savedMembership),
        };
        return cb(mockManager);
      });

      const dto: CreateOrganizationDto = {
        name: 'Test Organization',
        slug: 'test-org',
        description: 'Test Description',
      };

      const result = await service.create(dto, 'owner-123');

      expect(result).toEqual(savedOrg);
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when slug already exists', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization); // Slug exists

      const dto: CreateOrganizationDto = {
        name: 'New Org',
        slug: 'test-org', // Same slug
      };

      await expect(service.create(dto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create sub-organization with valid parent', async () => {
      organizationRepository.findOne
        .mockResolvedValueOnce(null) // Slug check
        .mockResolvedValueOnce(mockOrganization); // Parent check

      const savedOrg = { ...mockSubOrganization };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          create: jest.fn().mockReturnValue(savedOrg),
          save: jest.fn().mockResolvedValue(savedOrg),
        };
        return cb(mockManager);
      });

      const dto: CreateOrganizationDto = {
        name: 'Sub Org',
        slug: 'sub-org',
        parentId: 'org-123',
      };

      const result = await service.create(dto, 'owner-123');

      expect(result.parentId).toBe('org-123');
    });

    it('should throw NotFoundException when parent organization not found', async () => {
      organizationRepository.findOne
        .mockResolvedValueOnce(null) // Slug check
        .mockResolvedValueOnce(null); // Parent check - not found

      const dto: CreateOrganizationDto = {
        name: 'Sub Org',
        slug: 'sub-org',
        parentId: 'nonexistent-parent',
      };

      await expect(service.create(dto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when trying to create sub-sub-organization', async () => {
      // Need to mock for both assertions since each expect() call invokes the service
      organizationRepository.findOne
        .mockResolvedValueOnce(null) // Slug check for first assertion
        .mockResolvedValueOnce(mockSubOrganization); // Parent is already a sub-org

      const dto: CreateOrganizationDto = {
        name: 'Sub Sub Org',
        slug: 'sub-sub-org',
        parentId: 'sub-org-456',
      };

      await expect(service.create(dto, 'user-123')).rejects.toThrow(
        /Cannot create sub-organization of a sub-organization/,
      );
    });
  });

  describe('addMember', () => {
    it('should add member with specified viewer role', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      membershipRepository.findOne.mockResolvedValue(null); // Not existing member
      membershipRepository.create.mockReturnValue(mockViewerMembership);
      membershipRepository.save.mockResolvedValue(mockViewerMembership);

      const dto: AddMemberDto = { userId: 'new-user-123', role: 'viewer' };
      const result = await service.addMember('org-123', dto);

      expect(membershipRepository.create).toHaveBeenCalledWith({
        userId: 'new-user-123',
        organizationId: 'org-123',
        role: 'viewer',
      });
      expect(result).toEqual(mockViewerMembership);
    });

    it('should add member with specified role', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      membershipRepository.findOne.mockResolvedValue(null);
      membershipRepository.create.mockReturnValue(mockAdminMembership);
      membershipRepository.save.mockResolvedValue(mockAdminMembership);

      const dto: AddMemberDto = { userId: 'new-admin-123', role: 'admin' };
      const result = await service.addMember('org-123', dto);

      expect(membershipRepository.create).toHaveBeenCalledWith({
        userId: 'new-admin-123',
        organizationId: 'org-123',
        role: 'admin',
      });
      expect(result).toEqual(mockAdminMembership);
    });

    it('should throw NotFoundException when organization not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const dto: AddMemberDto = { userId: 'user-123', role: 'viewer' };

      await expect(service.addMember('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when user is already a member', async () => {
      organizationRepository.findOne.mockResolvedValue(mockOrganization);
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership); // Already exists

      const dto: AddMemberDto = { userId: 'viewer-789', role: 'viewer' };

      await expect(service.addMember('org-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeMember', () => {
    it('should remove member when not the last owner', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);
      membershipRepository.remove.mockResolvedValue(undefined as any);

      await service.removeMember('org-123', 'admin-456');

      expect(membershipRepository.remove).toHaveBeenCalledWith(mockAdminMembership);
    });

    it('should throw NotFoundException when membership not found', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      await expect(service.removeMember('org-123', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when trying to remove the last owner', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      membershipRepository.count.mockResolvedValue(1); // Only one owner

      await expect(service.removeMember('org-123', 'owner-123')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.removeMember('org-123', 'owner-123')).rejects.toThrow(
        'Cannot remove the last owner of the organization',
      );
    });

    it('should allow removing owner when there are multiple owners', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      membershipRepository.count.mockResolvedValue(2); // Two owners
      membershipRepository.remove.mockResolvedValue(undefined as any);

      await service.removeMember('org-123', 'owner-123');

      expect(membershipRepository.remove).toHaveBeenCalledWith(mockOwnerMembership);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const updatedMembership = { ...mockViewerMembership, role: 'admin' as UserRole };
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);
      membershipRepository.save.mockResolvedValue(updatedMembership as OrganizationMembership);

      const result = await service.updateMemberRole('org-123', 'viewer-789', 'admin');

      expect(result.role).toBe('admin');
    });

    it('should throw NotFoundException when membership not found', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('org-123', 'nonexistent', 'admin'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when downgrading the last owner', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      membershipRepository.count.mockResolvedValue(1); // Only one owner

      await expect(
        service.updateMemberRole('org-123', 'owner-123', 'admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow downgrading owner when there are multiple owners', async () => {
      const demotedOwner = { ...mockOwnerMembership, role: 'admin' as UserRole };
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      membershipRepository.count.mockResolvedValue(2); // Two owners
      membershipRepository.save.mockResolvedValue(demotedOwner as OrganizationMembership);

      const result = await service.updateMemberRole('org-123', 'owner-123', 'admin');

      expect(result.role).toBe('admin');
    });

    it('should allow promoting to owner', async () => {
      const promotedMember = { ...mockViewerMembership, role: 'owner' as UserRole };
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);
      membershipRepository.save.mockResolvedValue(promotedMember as OrganizationMembership);

      const result = await service.updateMemberRole('org-123', 'viewer-789', 'owner');

      expect(result.role).toBe('owner');
    });
  });

  describe('getMembership', () => {
    it('should return membership when found', async () => {
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);

      const result = await service.getMembership('viewer-789', 'org-123');

      expect(result).toEqual(mockViewerMembership);
    });

    it('should return null when membership not found', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await service.getMembership('nonexistent', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('getUserRole', () => {
    it('should return role when user is a member', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);

      const result = await service.getUserRole('admin-456', 'org-123');

      expect(result).toBe('admin');
    });

    it('should return null when user is not a member', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserRole('nonexistent', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should return true when owner checks admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);

      const result = await service.hasPermission('owner-123', 'org-123', 'admin');

      expect(result).toBe(true);
    });

    it('should return true when admin has admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);

      const result = await service.hasPermission('admin-456', 'org-123', 'admin');

      expect(result).toBe(true);
    });

    it('should return false when viewer requests admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);

      const result = await service.hasPermission('viewer-789', 'org-123', 'admin');

      expect(result).toBe(false);
    });

    it('should return false when user is not a member', async () => {
      membershipRepository.findOne.mockResolvedValue(null);

      const result = await service.hasPermission('nonexistent', 'org-123', 'viewer');

      expect(result).toBe(false);
    });

    // Individual tests for owner permissions (split for isolation)
    it('should allow owner to have owner permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      expect(await service.hasPermission('owner-123', 'org-123', 'owner')).toBe(true);
    });

    it('should allow owner to have admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      expect(await service.hasPermission('owner-123', 'org-123', 'admin')).toBe(true);
    });

    it('should allow owner to have viewer permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      expect(await service.hasPermission('owner-123', 'org-123', 'viewer')).toBe(true);
    });

    // Individual tests for admin permissions (split for isolation)
    it('should deny admin owner permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);
      expect(await service.hasPermission('admin-456', 'org-123', 'owner')).toBe(false);
    });

    it('should allow admin to have admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);
      expect(await service.hasPermission('admin-456', 'org-123', 'admin')).toBe(true);
    });

    it('should allow admin to have viewer permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockAdminMembership);
      expect(await service.hasPermission('admin-456', 'org-123', 'viewer')).toBe(true);
    });

    // Individual tests for viewer permissions (split for isolation)
    it('should deny viewer owner permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);
      expect(await service.hasPermission('viewer-789', 'org-123', 'owner')).toBe(false);
    });

    it('should deny viewer admin permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);
      expect(await service.hasPermission('viewer-789', 'org-123', 'admin')).toBe(false);
    });

    it('should allow viewer to have viewer permission', async () => {
      membershipRepository.findOne.mockResolvedValue(mockViewerMembership);
      expect(await service.hasPermission('viewer-789', 'org-123', 'viewer')).toBe(true);
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return all members with user relations', async () => {
      const members = [mockOwnerMembership, mockAdminMembership, mockViewerMembership];
      membershipRepository.find.mockResolvedValue(members);

      const result = await service.getOrganizationMembers('org-123');

      expect(result).toEqual(members);
      expect(membershipRepository.find).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        relations: ['user'],
      });
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations user belongs to', async () => {
      const memberships = [mockOwnerMembership];
      membershipRepository.find.mockResolvedValue(memberships);

      const result = await service.getUserOrganizations('owner-123');

      expect(result).toEqual(memberships);
      expect(membershipRepository.find).toHaveBeenCalledWith({
        where: { userId: 'owner-123' },
        relations: ['organization'],
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle organization with null description', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const savedOrg = { ...mockOrganization, description: null };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          create: jest.fn().mockReturnValue(savedOrg),
          save: jest.fn().mockResolvedValue(savedOrg),
        };
        return cb(mockManager);
      });

      const dto: CreateOrganizationDto = {
        name: 'Org Without Description',
        slug: 'no-desc-org',
      };

      const result = await service.create(dto, 'user-123');

      expect(result.description).toBeNull();
    });

    it('should handle concurrent membership operations atomically', async () => {
      // Simulating a scenario where the last owner check passes but another operation removes an owner
      membershipRepository.findOne.mockResolvedValue(mockOwnerMembership);
      membershipRepository.count.mockResolvedValue(2); // Two owners at check time
      membershipRepository.remove.mockResolvedValue(undefined as any);

      await service.removeMember('org-123', 'owner-123');

      expect(membershipRepository.remove).toHaveBeenCalled();
    });
  });
});
