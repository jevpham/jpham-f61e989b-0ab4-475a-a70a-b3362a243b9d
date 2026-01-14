import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, Mock } from 'vitest';
import { TasksStore } from './tasks.store';
import { TasksService, TaskFilters } from '../../core/services/tasks.service';
import {
  ITask,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  CreateTaskDto,
  UpdateTaskDto,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

describe('TasksStore', () => {
  let store: InstanceType<typeof TasksStore>;
  let tasksServiceMock: {
    getTasks: Mock;
    getTask: Mock;
    createTask: Mock;
    updateTask: Mock;
    deleteTask: Mock;
    reorderTask: Mock;
  };

  // Test fixtures
  const mockTask: ITask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    category: 'work' as TaskCategory,
    dueDate: null,
    position: 0,
    organizationId: 'org-123',
    createdById: 'user-123',
    assigneeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasks: ITask[] = [
    { ...mockTask, id: 'task-1', status: 'todo' as TaskStatus, position: 0 },
    { ...mockTask, id: 'task-2', status: 'todo' as TaskStatus, position: 1 },
    { ...mockTask, id: 'task-3', status: 'in_progress' as TaskStatus, position: 0 },
    { ...mockTask, id: 'task-4', status: 'review' as TaskStatus, position: 0 },
    { ...mockTask, id: 'task-5', status: 'done' as TaskStatus, position: 0 },
    { ...mockTask, id: 'task-6', status: 'done' as TaskStatus, position: 1 },
  ];

  const organizationId = 'org-123';

  // Helper to flush async operations
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    tasksServiceMock = {
      getTasks: vi.fn(),
      getTask: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      reorderTask: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TasksStore,
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    });

    store = TestBed.inject(TasksStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.tasks()).toEqual([]);
      expect(store.selectedTask()).toBeNull();
      expect(store.filters()).toEqual({});
      expect(store.isLoading()).toBe(false);
      expect(store.isSaving()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should have empty task lists by status initially', () => {
      expect(store.todoTasks()).toEqual([]);
      expect(store.inProgressTasks()).toEqual([]);
      expect(store.reviewTasks()).toEqual([]);
      expect(store.doneTasks()).toEqual([]);
    });

    it('should have zero counts initially', () => {
      expect(store.taskCount()).toBe(0);
      expect(store.completedCount()).toBe(0);
      expect(store.completionRate()).toBe(0);
    });
  });

  describe('loadTasks', () => {
    it('should update tasks on successful load', async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));

      store.loadTasks({ organizationId });
      await flush();

      expect(store.tasks()).toEqual(mockTasks);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should apply filters when loading tasks', async () => {
      const filters: TaskFilters = { status: 'todo' };
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));

      store.loadTasks({ organizationId, filters });
      await flush();

      expect(tasksServiceMock.getTasks).toHaveBeenCalledWith(organizationId, filters);
      expect(store.filters()).toEqual(filters);
    });

    it('should set error on load failure', async () => {
      const errorResponse = { error: { message: 'Failed to fetch tasks' } };
      tasksServiceMock.getTasks.mockReturnValue(throwError(() => errorResponse));

      store.loadTasks({ organizationId });
      await flush();

      expect(store.tasks()).toEqual([]);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe('Failed to fetch tasks');
    });

    it('should set default error message when no message in response', async () => {
      tasksServiceMock.getTasks.mockReturnValue(throwError(() => ({})));

      store.loadTasks({ organizationId });
      await flush();

      expect(store.error()).toBe('Failed to load tasks');
    });
  });

  describe('createTask', () => {
    // CreateTaskDto doesn't have status field - status is set by backend
    const newTaskDto: CreateTaskDto = {
      title: 'New Task',
      description: 'New task description',
      priority: 'high',
      category: 'work',
    };

    const createdTask: ITask = {
      ...mockTask,
      id: 'new-task-id',
      title: newTaskDto.title,
      description: newTaskDto.description!,
      priority: 'high' as TaskPriority,
    };

    it('should add task to store on successful creation', async () => {
      tasksServiceMock.createTask.mockReturnValue(of(createdTask));

      store.createTask({ organizationId, dto: newTaskDto });
      await flush();

      expect(store.tasks()).toContainEqual(createdTask);
      expect(store.isSaving()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should set error on create failure', async () => {
      const errorResponse = { error: { message: 'Validation failed' } };
      tasksServiceMock.createTask.mockReturnValue(throwError(() => errorResponse));

      store.createTask({ organizationId, dto: newTaskDto });
      await flush();

      expect(store.isSaving()).toBe(false);
      expect(store.error()).toBe('Validation failed');
    });

    it('should set default error message when no message in response', async () => {
      tasksServiceMock.createTask.mockReturnValue(throwError(() => ({})));

      store.createTask({ organizationId, dto: newTaskDto });
      await flush();

      expect(store.error()).toBe('Failed to create task');
    });
  });

  describe('updateTask', () => {
    const updateDto: UpdateTaskDto = {
      title: 'Updated Task Title',
      status: 'in_progress',
    };

    beforeEach(async () => {
      // Load initial tasks
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should update task in store on successful update', async () => {
      const updatedTask = { ...mockTasks[0], ...updateDto };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTask({ organizationId, taskId: 'task-1', dto: updateDto });
      await flush();

      const task = store.tasks().find((t) => t.id === 'task-1');
      expect(task?.title).toBe('Updated Task Title');
      expect(task?.status).toBe('in_progress');
    });

    it('should update selectedTask if it matches updated task', async () => {
      // Select a task first
      store.selectTask(mockTasks[0]);

      const updatedTask = { ...mockTasks[0], ...updateDto };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTask({ organizationId, taskId: 'task-1', dto: updateDto });
      await flush();

      expect(store.selectedTask()?.title).toBe('Updated Task Title');
    });

    it('should not update selectedTask if it does not match updated task', async () => {
      // Select a different task
      store.selectTask(mockTasks[1]);

      const updatedTask = { ...mockTasks[0], ...updateDto };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTask({ organizationId, taskId: 'task-1', dto: updateDto });
      await flush();

      expect(store.selectedTask()?.id).toBe('task-2');
    });

    it('should set error on update failure', async () => {
      const errorResponse = { error: { message: 'Update failed' } };
      tasksServiceMock.updateTask.mockReturnValue(throwError(() => errorResponse));

      store.updateTask({ organizationId, taskId: 'task-1', dto: updateDto });
      await flush();

      expect(store.isSaving()).toBe(false);
      expect(store.error()).toBe('Update failed');
    });
  });

  describe('deleteTask', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should remove task from store on successful deletion', async () => {
      tasksServiceMock.deleteTask.mockReturnValue(of(undefined));

      const initialCount = store.tasks().length;
      store.deleteTask({ organizationId, taskId: 'task-1' });
      await flush();

      expect(store.tasks().length).toBe(initialCount - 1);
      expect(store.tasks().find((t) => t.id === 'task-1')).toBeUndefined();
    });

    it('should clear selectedTask if it matches deleted task', async () => {
      store.selectTask(mockTasks[0]);
      tasksServiceMock.deleteTask.mockReturnValue(of(undefined));

      store.deleteTask({ organizationId, taskId: 'task-1' });
      await flush();

      expect(store.selectedTask()).toBeNull();
    });

    it('should keep selectedTask if it does not match deleted task', async () => {
      store.selectTask(mockTasks[1]);
      tasksServiceMock.deleteTask.mockReturnValue(of(undefined));

      store.deleteTask({ organizationId, taskId: 'task-1' });
      await flush();

      expect(store.selectedTask()?.id).toBe('task-2');
    });

    it('should set error on delete failure', async () => {
      const errorResponse = { error: { message: 'Delete failed' } };
      tasksServiceMock.deleteTask.mockReturnValue(throwError(() => errorResponse));

      store.deleteTask({ organizationId, taskId: 'task-1' });
      await flush();

      expect(store.isSaving()).toBe(false);
      expect(store.error()).toBe('Delete failed');
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should call updateTask with status dto', async () => {
      const updatedTask = { ...mockTasks[0], status: 'done' as TaskStatus };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTaskStatus(organizationId, 'task-1', 'done');
      await flush();

      expect(tasksServiceMock.updateTask).toHaveBeenCalledWith(
        organizationId,
        'task-1',
        { status: 'done' },
      );
    });
  });

  describe('selectTask', () => {
    it('should set selectedTask', () => {
      store.selectTask(mockTask);

      expect(store.selectedTask()).toEqual(mockTask);
    });

    it('should clear selectedTask when null is passed', () => {
      store.selectTask(mockTask);
      store.selectTask(null);

      expect(store.selectedTask()).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('should update filters', () => {
      const filters: TaskFilters = { status: 'todo', assigneeId: 'user-123' };

      store.setFilters(filters);

      expect(store.filters()).toEqual(filters);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // First set an error
      tasksServiceMock.getTasks.mockReturnValue(
        throwError(() => ({ error: { message: 'Error' } })),
      );
      store.loadTasks({ organizationId });
      await flush();

      expect(store.error()).toBe('Error');

      store.clearError();

      expect(store.error()).toBeNull();
    });
  });

  describe('Computed Properties', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should correctly group tasks by status', () => {
      expect(store.todoTasks().length).toBe(2);
      expect(store.inProgressTasks().length).toBe(1);
      expect(store.reviewTasks().length).toBe(1);
      expect(store.doneTasks().length).toBe(2);
    });

    it('should compute correct taskCount', () => {
      expect(store.taskCount()).toBe(6);
    });

    it('should compute correct completedCount', () => {
      expect(store.completedCount()).toBe(2);
    });

    it('should compute correct completionRate', () => {
      // 2 done out of 6 = 33.33% -> rounded to 33
      expect(store.completionRate()).toBe(33);
    });

    it('should compute completionRate as 0 when no tasks', async () => {
      tasksServiceMock.getTasks.mockReturnValue(of([]));
      store.loadTasks({ organizationId });
      await flush();

      expect(store.completionRate()).toBe(0);
    });

    it('should compute completionRate as 100 when all tasks done', async () => {
      const allDoneTasks: ITask[] = [
        { ...mockTask, id: 'task-1', status: 'done' as TaskStatus },
        { ...mockTask, id: 'task-2', status: 'done' as TaskStatus },
      ];
      tasksServiceMock.getTasks.mockReturnValue(of(allDoneTasks));
      store.loadTasks({ organizationId });
      await flush();

      expect(store.completionRate()).toBe(100);
    });
  });

  describe('Task Status Grouping after Updates', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should update task groups when task status changes', async () => {
      // Initially 2 todo tasks
      expect(store.todoTasks().length).toBe(2);
      expect(store.inProgressTasks().length).toBe(1);

      // Update task-1 from todo to in_progress
      const updatedTask = { ...mockTasks[0], status: 'in_progress' as TaskStatus };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTask({
        organizationId,
        taskId: 'task-1',
        dto: { status: 'in_progress' },
      });
      await flush();

      // Now 1 todo and 2 in_progress
      expect(store.todoTasks().length).toBe(1);
      expect(store.inProgressTasks().length).toBe(2);
    });

    it('should update completion rate when task moves to done', async () => {
      // Initially 2/6 done = 33%
      expect(store.completionRate()).toBe(33);

      // Move task-1 to done
      const updatedTask = { ...mockTasks[0], status: 'done' as TaskStatus };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.updateTask({
        organizationId,
        taskId: 'task-1',
        dto: { status: 'done' },
      });
      await flush();

      // Now 3/6 done = 50%
      expect(store.completionRate()).toBe(50);
    });
  });
});
