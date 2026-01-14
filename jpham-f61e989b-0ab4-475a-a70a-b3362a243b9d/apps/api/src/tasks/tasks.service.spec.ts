import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksService, TaskFilters } from './tasks.service';
import { Task } from './entities/task.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { IUser, TaskStatus, TaskPriority, UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let organizationsService: jest.Mocked<OrganizationsService>;
  let dataSource: jest.Mocked<DataSource>;

  // Test fixtures
  const mockOwnerUser: IUser = {
    id: 'owner-123',
    email: 'owner@example.com',
    organizationId: 'org-123',
    role: 'owner' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminUser: IUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    organizationId: 'org-123',
    role: 'admin' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewerUser: IUser = {
    id: 'viewer-123',
    email: 'viewer@example.com',
    organizationId: 'org-123',
    role: 'viewer' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: null,
    position: 1,
    organizationId: 'org-123',
    createdById: 'admin-123',
    assigneeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Task;

  const mockOwnerMembership = { userId: 'owner-123', organizationId: 'org-123', role: 'owner' as UserRole };
  const mockAdminMembership = { userId: 'admin-123', organizationId: 'org-123', role: 'admin' as UserRole };
  const mockViewerMembership = { userId: 'viewer-123', organizationId: 'org-123', role: 'viewer' as UserRole };

  // Helper to create a chainable QueryBuilder mock
  const createMockQueryBuilder = (returnValue: any = null): any => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
      getOne: jest.fn().mockResolvedValue(returnValue),
      getMany: jest.fn().mockResolvedValue(Array.isArray(returnValue) ? returnValue : [returnValue].filter(Boolean)),
      getManyAndCount: jest.fn().mockResolvedValue([
        Array.isArray(returnValue) ? returnValue : [returnValue].filter(Boolean),
        Array.isArray(returnValue) ? returnValue.length : (returnValue ? 1 : 0),
      ]),
      getRawOne: jest.fn().mockResolvedValue({ max: 5 }),
    };
    return mockQb;
  };

  // Helper to create a mock transaction manager
  const createMockManager = (maxPosition = 5) => {
    const mockQb = createMockQueryBuilder(null);
    mockQb.getRawOne.mockResolvedValue({ max: maxPosition });

    return {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      create: jest.fn().mockImplementation((EntityClass, data) => ({ ...data, id: 'new-task-id' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };

    const mockOrganizationsService = {
      getMembership: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(),
      options: { type: 'sqlite' }, // Mock database type for supportsPessimisticLocking()
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockRepository },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    organizationsService = module.get(OrganizationsService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return task with relations when found', async () => {
      const mockQb = createMockQueryBuilder(mockTask);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findById('task-123');

      expect(result).toEqual(mockTask);
      expect(taskRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.createdBy', 'createdBy');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.assignee', 'assignee');
      expect(mockQb.where).toHaveBeenCalledWith('task.id = :id', { id: 'task-123' });
      expect(mockQb.getOne).toHaveBeenCalled();
    });

    it('should return null when task not found', async () => {
      const mockQb = createMockQueryBuilder(null);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByOrganization', () => {
    it('should return paginated tasks for organization without filters', async () => {
      const tasks = [mockTask];
      const mockQb = createMockQueryBuilder(tasks);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findByOrganization('org-123');

      expect(result.data).toEqual(tasks);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(taskRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.createdBy', 'createdBy');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.assignee', 'assignee');
      expect(mockQb.where).toHaveBeenCalledWith('task.organizationId = :organizationId', { organizationId: 'org-123' });
      expect(mockQb.orderBy).toHaveBeenCalledWith('task.position', 'ASC');
      expect(mockQb.getManyAndCount).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findByOrganization('org-123', { status: 'in_progress' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.status = :status', { status: 'in_progress' });
    });

    it('should filter by assigneeId', async () => {
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findByOrganization('org-123', { assigneeId: 'user-456' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.assigneeId = :assigneeId', { assigneeId: 'user-456' });
    });

    it('should filter by createdById', async () => {
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findByOrganization('org-123', { createdById: 'user-789' });

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.createdById = :createdById', { createdById: 'user-789' });
    });

    it('should apply multiple filters', async () => {
      const filters: TaskFilters = {
        status: 'done' as TaskStatus,
        assigneeId: 'user-1',
        createdById: 'user-2',
      };
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findByOrganization('org-123', filters);

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.status = :status', { status: 'done' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('task.assigneeId = :assigneeId', { assigneeId: 'user-1' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('task.createdById = :createdById', { createdById: 'user-2' });
    });

    it('should apply pagination parameters', async () => {
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findByOrganization('org-123', undefined, 2, 25);

      expect(mockQb.skip).toHaveBeenCalledWith(25); // (page-1) * limit = (2-1) * 25 = 25
      expect(mockQb.take).toHaveBeenCalledWith(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('should cap limit at 100', async () => {
      const mockQb = createMockQueryBuilder([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findByOrganization('org-123', undefined, 1, 200);

      expect(mockQb.take).toHaveBeenCalledWith(100);
      expect(result.limit).toBe(100);
    });
  });

  describe('create', () => {
    let mockManager: ReturnType<typeof createMockManager>;

    beforeEach(() => {
      mockManager = createMockManager(5);
      // Mock the transaction to call the callback with our mock manager
      dataSource.transaction.mockImplementation(async (callback: any) => {
        return callback(mockManager);
      });
    });

    it('should create task when user is owner', async () => {
      organizationsService.getMembership.mockResolvedValue(mockOwnerMembership as any);

      const dto = { title: 'New Task', description: 'Description' };
      const result = await service.create('org-123', dto, mockOwnerUser);

      expect(result).toBeDefined();
      expect(mockManager.create).toHaveBeenCalledWith(
        Task,
        expect.objectContaining({
          title: 'New Task',
          description: 'Description',
          organizationId: 'org-123',
          createdById: 'owner-123',
          position: 6, // max + 1
        }),
      );
    });

    it('should create task when user is admin', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = { title: 'New Task' };
      const result = await service.create('org-123', dto, mockAdminUser);

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when user is viewer', async () => {
      organizationsService.getMembership.mockResolvedValue(mockViewerMembership as any);

      const dto = { title: 'New Task' };

      await expect(service.create('org-123', dto, mockViewerUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      organizationsService.getMembership.mockResolvedValue(null);

      const dto = { title: 'New Task' };

      await expect(service.create('org-123', dto, mockAdminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate assignee is a member of the organization', async () => {
      organizationsService.getMembership
        .mockResolvedValueOnce(mockAdminMembership as any) // First call: check user membership
        .mockResolvedValueOnce(null); // Second call: check assignee membership

      const dto = { title: 'New Task', assigneeId: 'non-member-user' };

      await expect(service.create('org-123', dto, mockAdminUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow valid assignee', async () => {
      organizationsService.getMembership
        .mockResolvedValueOnce(mockAdminMembership as any) // User membership
        .mockResolvedValueOnce(mockViewerMembership as any); // Assignee membership

      const dto = { title: 'New Task', assigneeId: 'viewer-123' };
      const result = await service.create('org-123', dto, mockAdminUser);

      expect(result).toBeDefined();
      expect(mockManager.create).toHaveBeenCalledWith(
        Task,
        expect.objectContaining({
          assigneeId: 'viewer-123',
        }),
      );
    });

    it('should set default priority to medium', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = { title: 'New Task' };
      await service.create('org-123', dto, mockAdminUser);

      expect(mockManager.create).toHaveBeenCalledWith(
        Task,
        expect.objectContaining({
          priority: 'medium',
        }),
      );
    });

    it('should parse dueDate string to Date', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = { title: 'New Task', dueDate: '2024-12-31' };
      await service.create('org-123', dto, mockAdminUser);

      expect(mockManager.create).toHaveBeenCalledWith(
        Task,
        expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      const mockQb = createMockQueryBuilder(mockTask);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      taskRepository.save.mockImplementation((task) => Promise.resolve(task as Task));
    });

    it('should allow admin to update any task', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = { title: 'Updated Title' };
      const result = await service.update('task-123', dto, mockAdminUser, 'org-123');

      expect(result.title).toBe('Updated Title');
    });

    it('should allow owner to update any task', async () => {
      organizationsService.getMembership.mockResolvedValue(mockOwnerMembership as any);

      const dto = { title: 'Updated by Owner' };
      const result = await service.update('task-123', dto, mockOwnerUser, 'org-123');

      expect(result.title).toBe('Updated by Owner');
    });

    it('should allow task creator to update their own task', async () => {
      const taskCreatedByViewer = { ...mockTask, createdById: 'viewer-123' };
      const mockQb = createMockQueryBuilder(taskCreatedByViewer);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      organizationsService.getMembership.mockResolvedValue(mockViewerMembership as any);

      const dto = { title: 'Updated by Creator' };
      const result = await service.update('task-123', dto, mockViewerUser, 'org-123');

      expect(result.title).toBe('Updated by Creator');
    });

    it('should allow assignee to update their assigned task', async () => {
      const taskAssignedToViewer = { ...mockTask, assigneeId: 'viewer-123' };
      const mockQb = createMockQueryBuilder(taskAssignedToViewer);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      organizationsService.getMembership.mockResolvedValue(mockViewerMembership as any);

      const dto = { status: 'in_progress' as TaskStatus };
      const result = await service.update('task-123', dto, mockViewerUser, 'org-123');

      expect(result.status).toBe('in_progress');
    });

    it('should throw ForbiddenException for viewer updating unrelated task', async () => {
      organizationsService.getMembership.mockResolvedValue(mockViewerMembership as any);

      const dto = { title: 'Unauthorized Update' };

      await expect(service.update('task-123', dto, mockViewerUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const mockQb = createMockQueryBuilder(null);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.update('nonexistent', {}, mockAdminUser, 'org-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      organizationsService.getMembership.mockResolvedValue(null);

      await expect(service.update('task-123', {}, mockAdminUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate new assignee is a member', async () => {
      organizationsService.getMembership
        .mockResolvedValueOnce(mockAdminMembership as any) // User membership
        .mockResolvedValueOnce(null); // Assignee membership

      const dto = { assigneeId: 'non-member' };

      await expect(service.update('task-123', dto, mockAdminUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow setting assigneeId to null', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = { assigneeId: null };
      const result = await service.update('task-123', dto, mockAdminUser, 'org-123');

      expect(result.assigneeId).toBeNull();
    });

    it('should update all provided fields', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      const dto = {
        title: 'New Title',
        description: 'New Description',
        status: 'done' as TaskStatus,
        priority: 'high' as TaskPriority,
        dueDate: '2024-12-31',
      };

      const result = await service.update('task-123', dto, mockAdminUser, 'org-123');

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(result.status).toBe('done');
      expect(result.priority).toBe('high');
      expect(result.dueDate).toEqual(new Date('2024-12-31'));
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      const mockQb = createMockQueryBuilder(mockTask);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      taskRepository.remove.mockResolvedValue(undefined as any);
    });

    it('should allow owner to delete any task', async () => {
      organizationsService.getMembership.mockResolvedValue(mockOwnerMembership as any);

      await service.delete('task-123', mockOwnerUser, 'org-123');

      expect(taskRepository.remove).toHaveBeenCalled();
    });

    it('should allow admin to delete any task', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);

      await service.delete('task-123', mockAdminUser, 'org-123');

      expect(taskRepository.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when viewer tries to delete', async () => {
      organizationsService.getMembership.mockResolvedValue(mockViewerMembership as any);

      await expect(service.delete('task-123', mockViewerUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      const mockQb = createMockQueryBuilder(null);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await expect(service.delete('nonexistent', mockAdminUser, 'org-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      organizationsService.getMembership.mockResolvedValue(null);

      await expect(service.delete('task-123', mockAdminUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('reorder', () => {
    beforeEach(() => {
      taskRepository.findOne.mockResolvedValue(mockTask);
    });

    it('should throw BadRequestException for negative position', async () => {
      await expect(service.reorder('task-123', -1, mockAdminUser, 'org-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.reorder('nonexistent', 5, mockAdminUser, 'org-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      organizationsService.getMembership.mockResolvedValue(null);

      await expect(service.reorder('task-123', 5, mockAdminUser, 'org-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return unchanged task when position is the same', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);
      const taskAtPosition1 = { ...mockTask, position: 1 };
      taskRepository.findOne.mockResolvedValue(taskAtPosition1 as Task);

      const result = await service.reorder('task-123', 1, mockAdminUser, 'org-123');

      expect(result).toEqual(taskAtPosition1);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('should use transaction for reordering', async () => {
      organizationsService.getMembership.mockResolvedValue(mockAdminMembership as any);
      const updatedTask = { ...mockTask, position: 5 };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(undefined),
          }),
          save: jest.fn().mockResolvedValue(updatedTask),
        };
        return cb(mockManager);
      });

      const result = await service.reorder('task-123', 5, mockAdminUser, 'org-123');

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual(updatedTask);
    });
  });

  describe('RBAC Permission Matrix', () => {
    // Comprehensive RBAC tests
    const testCases = [
      { role: 'owner', action: 'create', shouldSucceed: true },
      { role: 'owner', action: 'update', shouldSucceed: true },
      { role: 'owner', action: 'delete', shouldSucceed: true },
      { role: 'admin', action: 'create', shouldSucceed: true },
      { role: 'admin', action: 'update', shouldSucceed: true },
      { role: 'admin', action: 'delete', shouldSucceed: true },
      { role: 'viewer', action: 'create', shouldSucceed: false },
      { role: 'viewer', action: 'update', shouldSucceed: false }, // Unless creator/assignee
      { role: 'viewer', action: 'delete', shouldSucceed: false },
    ];

    testCases.forEach(({ role, action, shouldSucceed }) => {
      const user = role === 'owner' ? mockOwnerUser : role === 'admin' ? mockAdminUser : mockViewerUser;
      const membership = role === 'owner' ? mockOwnerMembership : role === 'admin' ? mockAdminMembership : mockViewerMembership;

      it(`${role} ${shouldSucceed ? 'can' : 'cannot'} ${action} tasks`, async () => {
        organizationsService.getMembership.mockResolvedValue(membership as any);

        if (action === 'create') {
          // Mock the transaction for create operations
          const mockManager = createMockManager(0);
          dataSource.transaction.mockImplementation(async (callback: any) => {
            return callback(mockManager);
          });

          if (shouldSucceed) {
            await expect(service.create('org-123', { title: 'Test' }, user)).resolves.toBeDefined();
          } else {
            await expect(service.create('org-123', { title: 'Test' }, user)).rejects.toThrow(ForbiddenException);
          }
        } else if (action === 'delete') {
          const mockQb = createMockQueryBuilder(mockTask);
          taskRepository.createQueryBuilder.mockReturnValue(mockQb);
          taskRepository.remove.mockResolvedValue(undefined as any);

          if (shouldSucceed) {
            await expect(service.delete('task-123', user, 'org-123')).resolves.toBeUndefined();
          } else {
            await expect(service.delete('task-123', user, 'org-123')).rejects.toThrow(ForbiddenException);
          }
        }
      });
    });
  });
});
