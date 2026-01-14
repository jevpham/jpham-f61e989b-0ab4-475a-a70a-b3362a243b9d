import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './entities/task.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  IUser,
  TaskStatus,
  TaskCategory,
  AuditAction,
  hasMinimumRole,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  assigneeId?: string;
  createdById?: string;
}

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly organizationsService: OrganizationsService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Helpers: Authorization & Database Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Verifies user membership and checks if they have the required role.
   * Throws ForbiddenException if access is denied.
   */
  private async verifyMembershipWithRole(
    userId: string,
    organizationId: string,
    requiredRole: 'admin' | 'viewer' = 'viewer',
    errorMessage = 'You do not have permission to perform this action',
  ) {
    const membership = await this.organizationsService.getMembership(userId, organizationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    if (requiredRole !== 'viewer' && !hasMinimumRole(membership.role, requiredRole)) {
      throw new ForbiddenException(errorMessage);
    }
    return membership;
  }

  /**
   * Validates that a task belongs to the expected organization.
   * Throws ForbiddenException if the task doesn't match.
   */
  private validateTaskOrganization(task: Task, expectedOrgId: string): void {
    if (task.organizationId !== expectedOrgId) {
      throw new ForbiddenException('Access denied');
    }
  }

  /**
   * Checks if the database supports row-level pessimistic locking.
   * SQLite uses file-level locking and doesn't support row-level locks.
   */
  private supportsPessimisticLocking(): boolean {
    const driverName = this.dataSource.options.type;
    return driverName === 'postgres' || driverName === 'mysql' || driverName === 'mariadb';
  }

  /**
   * Fire-and-forget audit logging with error reporting.
   * Failures are logged but don't block the main operation.
   */
  private logAudit(params: {
    action: AuditAction;
    resource: string;
    resourceId: string;
    userId: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.auditService.log(params).catch((error) => {
      this.logger.error('Failed to log audit event', {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }

  async findById(id: string): Promise<Task | null> {
    // Use QueryBuilder with explicit JOINs to avoid N+1 queries
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.id = :id', { id })
      .getOne();
  }

  // Lightweight version for operations that don't need relations
  async findByIdLight(id: string): Promise<Task | null> {
    return this.taskRepository.findOne({ where: { id } });
  }

  async findByOrganization(
    organizationId: string,
    filters?: TaskFilters,
    page = 1,
    limit = 50,
  ): Promise<PaginatedTasks> {
    // Validate and cap pagination params
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap at 100

    // Use QueryBuilder with LEFT JOINs to fetch data in a single query
    // This avoids N+1 query patterns that occur with TypeORM's `relations` option
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.organizationId = :organizationId', { organizationId })
      .orderBy('task.position', 'ASC')
      .addOrderBy('task.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters?.category) {
      qb.andWhere('task.category = :category', { category: filters.category });
    }
    if (filters?.assigneeId) {
      qb.andWhere('task.assigneeId = :assigneeId', { assigneeId: filters.assigneeId });
    }
    if (filters?.createdById) {
      qb.andWhere('task.createdById = :createdById', { createdById: filters.createdById });
    }

    // Apply pagination
    qb.skip((safePage - 1) * safeLimit).take(safeLimit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async create(
    organizationId: string,
    dto: CreateTaskDto,
    user: IUser,
  ): Promise<Task> {
    // Verify membership and admin role
    await this.verifyMembershipWithRole(
      user.id,
      organizationId,
      'admin',
      'You do not have permission to create tasks',
    );

    // Validate assignee membership if provided
    if (dto.assigneeId) {
      const assigneeMembership = await this.organizationsService.getMembership(
        dto.assigneeId,
        organizationId,
      );
      if (!assigneeMembership) {
        throw new ForbiddenException('Assignee is not a member of this organization');
      }
    }

    // Use transaction to prevent race condition in position calculation
    const task = await this.dataSource.transaction(async (manager) => {
      const queryBuilder = manager
        .createQueryBuilder(Task, 'task')
        .select('MAX(task.position)', 'max')
        .where('task.organizationId = :organizationId', { organizationId });

      if (this.supportsPessimisticLocking()) {
        queryBuilder.setLock('pessimistic_write');
      }

      const maxPositionResult = await queryBuilder.getRawOne();

      const newTask = manager.create(Task, {
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'medium',
        category: dto.category ?? 'other',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId ?? null,
        organizationId,
        createdById: user.id,
        position: (maxPositionResult?.max ?? 0) + 1,
      });

      return manager.save(newTask);
    });

    this.logAudit({
      action: 'create',
      resource: 'task',
      resourceId: task.id,
      userId: user.id,
      organizationId,
      metadata: { title: task.title },
    });

    return task;
  }

  async update(
    taskId: string,
    dto: UpdateTaskDto,
    user: IUser,
    expectedOrgId: string,
  ): Promise<Task> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    this.validateTaskOrganization(task, expectedOrgId);

    // Get membership for permission checks
    const membership = await this.verifyMembershipWithRole(user.id, task.organizationId);

    // Permission: admins/owners can update any task, others can update their own
    const isAdmin = hasMinimumRole(membership.role, 'admin');
    const isCreator = task.createdById === user.id;
    const isAssignee = task.assigneeId === user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    // Validate assignee membership if being changed
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      const assigneeMembership = await this.organizationsService.getMembership(
        dto.assigneeId,
        task.organizationId,
      );
      if (!assigneeMembership) {
        throw new ForbiddenException('Assignee is not a member of this organization');
      }
    }

    // Capture state for reordering logic
    const oldStatus = task.status;
    const oldPosition = task.position;
    const newStatus = dto.status ?? task.status;
    const newPosition = dto.position ?? task.position;
    const statusChanged = dto.status !== undefined && dto.status !== oldStatus;
    const positionChanged = dto.position !== undefined && dto.position !== oldPosition;
    const shouldReorder = dto.position !== undefined && (statusChanged || positionChanged);

    const applyUpdates = () => {
      if (dto.title !== undefined) task.title = dto.title;
      if (dto.description !== undefined) task.description = dto.description;
      if (dto.status !== undefined) task.status = dto.status;
      if (dto.priority !== undefined) task.priority = dto.priority;
      if (dto.category !== undefined) task.category = dto.category;
      if (dto.dueDate !== undefined) {
        task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      }
      if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;
      if (dto.position !== undefined) task.position = dto.position;
    };

    let savedTask: Task;
    if (shouldReorder) {
      savedTask = await this.executeReorderTransaction(task, oldStatus, oldPosition, newStatus, newPosition, statusChanged, positionChanged, applyUpdates);
    } else {
      applyUpdates();
      savedTask = await this.taskRepository.save(task);
    }

    // Audit logging
    const action = statusChanged ? 'status_change' : 'update';
    this.logAudit({
      action,
      resource: 'task',
      resourceId: task.id,
      userId: user.id,
      organizationId: task.organizationId,
      metadata: {
        title: task.title,
        ...(statusChanged ? { oldStatus, newStatus: dto.status } : {}),
      },
    });

    return savedTask;
  }

  /**
   * Executes the reorder transaction with proper locking and position updates.
   */
  private async executeReorderTransaction(
    task: Task,
    oldStatus: string,
    oldPosition: number,
    newStatus: string,
    newPosition: number,
    statusChanged: boolean,
    positionChanged: boolean,
    applyUpdates: () => void,
  ): Promise<Task> {
    return this.dataSource.transaction(async (manager) => {
      if (this.supportsPessimisticLocking()) {
        await manager
          .createQueryBuilder(Task, 'task')
          .setLock('pessimistic_write')
          .where('task.id = :id', { id: task.id })
          .getOne();
      }

      if (statusChanged) {
        // Decrement positions in old column (exclude current task to prevent race condition)
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position - 1' })
          .where('organizationId = :orgId', { orgId: task.organizationId })
          .andWhere('status = :status', { status: oldStatus })
          .andWhere('position > :oldPos', { oldPos: oldPosition })
          .andWhere('id != :taskId', { taskId: task.id })
          .execute();

        // Increment positions in new column (exclude current task to prevent race condition)
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position + 1' })
          .where('organizationId = :orgId', { orgId: task.organizationId })
          .andWhere('status = :status', { status: newStatus })
          .andWhere('position >= :newPos', { newPos: newPosition })
          .andWhere('id != :taskId', { taskId: task.id })
          .execute();
      } else if (positionChanged) {
        await this.adjustPositionsWithinColumn(manager, task.organizationId, task.id, oldStatus, oldPosition, newPosition);
      }

      applyUpdates();
      return manager.save(task);
    });
  }

  /**
   * Adjusts positions when reordering within the same column.
   * Excludes the task being moved to prevent race conditions.
   */
  private async adjustPositionsWithinColumn(
    manager: import('typeorm').EntityManager,
    organizationId: string,
    taskId: string,
    status: string,
    oldPosition: number,
    newPosition: number,
  ): Promise<void> {
    if (newPosition > oldPosition) {
      // Moving down: decrement positions of tasks between old and new position
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ position: () => 'position - 1' })
        .where('organizationId = :orgId', { orgId: organizationId })
        .andWhere('status = :status', { status })
        .andWhere('position > :oldPos', { oldPos: oldPosition })
        .andWhere('position <= :newPos', { newPos: newPosition })
        .andWhere('id != :taskId', { taskId })
        .execute();
    } else {
      // Moving up: increment positions of tasks between new and old position
      await manager
        .createQueryBuilder()
        .update(Task)
        .set({ position: () => 'position + 1' })
        .where('organizationId = :orgId', { orgId: organizationId })
        .andWhere('status = :status', { status })
        .andWhere('position >= :newPos', { newPos: newPosition })
        .andWhere('position < :oldPos', { oldPos: oldPosition })
        .andWhere('id != :taskId', { taskId })
        .execute();
    }
  }

  async delete(taskId: string, user: IUser, expectedOrgId: string): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    this.validateTaskOrganization(task, expectedOrgId);

    await this.verifyMembershipWithRole(
      user.id,
      task.organizationId,
      'admin',
      'You do not have permission to delete this task',
    );

    // Store task info before deletion for audit
    const taskInfo = { id: task.id, title: task.title, organizationId: task.organizationId };

    await this.taskRepository.remove(task);

    this.logAudit({
      action: 'delete',
      resource: 'task',
      resourceId: taskInfo.id,
      userId: user.id,
      organizationId: taskInfo.organizationId,
      metadata: { title: taskInfo.title },
    });
  }

  async reorder(
    taskId: string,
    newPosition: number,
    user: IUser,
    expectedOrgId: string,
  ): Promise<Task> {
    if (newPosition < 0) {
      throw new BadRequestException('Position cannot be negative');
    }

    // Use lightweight query - we don't need relations for reordering
    const task = await this.findByIdLight(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    this.validateTaskOrganization(task, expectedOrgId);
    await this.verifyMembershipWithRole(user.id, task.organizationId);

    const oldPosition = task.position;
    if (oldPosition === newPosition) {
      return task;
    }

    // Execute reorder within transaction
    const reorderedTask = await this.dataSource.transaction(async (manager) => {
      if (this.supportsPessimisticLocking()) {
        await manager
          .createQueryBuilder(Task, 'task')
          .setLock('pessimistic_write')
          .where('task.id = :id', { id: taskId })
          .getOne();
      }

      await this.adjustPositionsWithinColumn(
        manager,
        task.organizationId,
        task.id,
        task.status,
        oldPosition,
        newPosition,
      );

      task.position = newPosition;
      return manager.save(task);
    });

    this.logAudit({
      action: 'reorder',
      resource: 'task',
      resourceId: task.id,
      userId: user.id,
      organizationId: task.organizationId,
      metadata: { title: task.title, oldPosition, newPosition },
    });

    return reorderedTask;
  }
}
