import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService, TaskFilters } from './tasks.service';
import { CurrentUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/auth';
import {
  IUser,
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  ReorderTaskDto,
  TaskStatus,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { OrganizationsService } from '../organizations/organizations.service';
import { Task } from './entities/task.entity';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('organizations/:orgId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  @ApiOperation({ summary: 'List tasks', description: 'Get paginated tasks in an organization with optional filtering' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['todo', 'in_progress', 'review', 'done'] })
  @ApiQuery({ name: 'assigneeId', required: false, description: 'Filter by assignee user ID' })
  @ApiQuery({ name: 'createdById', required: false, description: 'Filter by creator user ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of tasks' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findAll(
    @Param('orgId') orgId: string,
    @CurrentUser() user: IUser,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('createdById') createdById?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ): Promise<{ data: ITask[]; total: number; page: number; limit: number; totalPages: number }> {
    // Verify user has access to organization (read-only check)
    const membership = await this.organizationsService.getMembership(user.id, orgId);
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    const filters: TaskFilters = {};
    if (status) filters.status = status;
    if (assigneeId) filters.assigneeId = assigneeId;
    if (createdById) filters.createdById = createdById;

    const result = await this.tasksService.findByOrganization(
      orgId,
      filters,
      parseInt(page, 10),
      parseInt(limit, 10),
    );

    return {
      data: result.data.map((task) => this.toResponse(task)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  @ApiOperation({ summary: 'Get task', description: 'Get a single task by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns the task' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ): Promise<ITask> {
    // Verify user has access to organization (read-only check)
    const membership = await this.organizationsService.getMembership(user.id, orgId);
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    const task = await this.tasksService.findById(id);
    if (!task || task.organizationId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponse(task);
  }

  @Post()
  @ApiOperation({ summary: 'Create task', description: 'Create a new task in the organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: IUser,
  ): Promise<ITask> {
    // Service handles all authorization
    const task = await this.tasksService.create(orgId, dto, user);
    return this.toResponse(task);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task', description: 'Update an existing task' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - insufficient permissions' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: IUser,
  ): Promise<ITask> {
    // Service handles all authorization
    const task = await this.tasksService.update(id, dto, user);
    return this.toResponse(task);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task', description: 'Delete a task (Owner/Admin only)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - only owners/admins can delete tasks' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ): Promise<void> {
    // Service handles all authorization
    await this.tasksService.delete(id, user);
  }

  @Put(':id/reorder')
  @ApiOperation({ summary: 'Reorder task', description: 'Change task position within its column' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task reordered successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async reorder(
    @Param('id') id: string,
    @Body() dto: ReorderTaskDto,
    @CurrentUser() user: IUser,
  ): Promise<ITask> {
    // Service handles all authorization
    const task = await this.tasksService.reorder(id, dto.newPosition, user);
    return this.toResponse(task);
  }

  private toResponse(task: Task): ITask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      position: task.position,
      organizationId: task.organizationId,
      createdById: task.createdById,
      assigneeId: task.assigneeId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
