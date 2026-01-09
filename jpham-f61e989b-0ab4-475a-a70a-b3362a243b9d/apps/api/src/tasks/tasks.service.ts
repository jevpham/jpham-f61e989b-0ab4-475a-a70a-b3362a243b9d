import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Task } from './entities/task.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  IUser,
  TaskStatus,
  hasMinimumRole,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { OrganizationsService } from '../organizations/organizations.service';

export interface TaskFilters {
  status?: TaskStatus;
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
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly organizationsService: OrganizationsService,
    private readonly dataSource: DataSource,
  ) {}

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
    // Verify user is a member of the organization
    const membership = await this.organizationsService.getMembership(user.id, organizationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Only admins and owners can create tasks
    if (!hasMinimumRole(membership.role, 'admin')) {
      throw new ForbiddenException('You do not have permission to create tasks');
    }

    // Validate assignee is a member of the organization
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
    return this.dataSource.transaction(async (manager) => {
      // Get max position with FOR UPDATE lock to prevent concurrent inserts from getting same position
      const maxPositionResult = await manager
        .createQueryBuilder(Task, 'task')
        .select('MAX(task.position)', 'max')
        .where('task.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getRawOne();

      const task = manager.create(Task, {
        title: dto.title,
        description: dto.description ?? null,
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId ?? null,
        organizationId,
        createdById: user.id,
        position: (maxPositionResult?.max ?? 0) + 1,
      });

      return manager.save(task);
    });
  }

  async update(
    taskId: string,
    dto: UpdateTaskDto,
    user: IUser,
  ): Promise<Task> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify user is a member of the organization
    const membership = await this.organizationsService.getMembership(user.id, task.organizationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check permission: admins/owners can update any task, viewers can update their own
    const isAdmin = hasMinimumRole(membership.role, 'admin');
    const isCreator = task.createdById === user.id;
    const isAssignee = task.assigneeId === user.id;

    if (!isAdmin && !isCreator && !isAssignee) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    // Validate assignee is a member of the organization
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      const assigneeMembership = await this.organizationsService.getMembership(
        dto.assigneeId,
        task.organizationId,
      );
      if (!assigneeMembership) {
        throw new ForbiddenException('Assignee is not a member of this organization');
      }
    }

    // Apply updates
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;

    return this.taskRepository.save(task);
  }

  async delete(taskId: string, user: IUser): Promise<void> {
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify user is a member and has admin permission
    const membership = await this.organizationsService.getMembership(user.id, task.organizationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!hasMinimumRole(membership.role, 'admin')) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    await this.taskRepository.remove(task);
  }

  async reorder(
    taskId: string,
    newPosition: number,
    user: IUser,
  ): Promise<Task> {
    // Validate position
    if (newPosition < 0) {
      throw new BadRequestException('Position cannot be negative');
    }

    // Use lightweight query - we don't need relations for reordering
    const task = await this.findByIdLight(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify user is a member of the organization
    const membership = await this.organizationsService.getMembership(user.id, task.organizationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const oldPosition = task.position;

    if (oldPosition === newPosition) {
      return task;
    }

    // Use transaction for atomic reordering
    return this.dataSource.transaction(async (manager) => {
      if (newPosition > oldPosition) {
        // Moving down: decrease position of tasks in between
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position - 1' })
          .where('organizationId = :orgId', { orgId: task.organizationId })
          .andWhere('position > :oldPos', { oldPos: oldPosition })
          .andWhere('position <= :newPos', { newPos: newPosition })
          .execute();
      } else {
        // Moving up: increase position of tasks in between
        await manager
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position + 1' })
          .where('organizationId = :orgId', { orgId: task.organizationId })
          .andWhere('position >= :newPos', { newPos: newPosition })
          .andWhere('position < :oldPos', { oldPos: oldPosition })
          .execute();
      }

      task.position = newPosition;
      return manager.save(task);
    });
  }
}
