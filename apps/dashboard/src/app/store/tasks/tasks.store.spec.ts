import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, Mock } from 'vitest';
import { TasksStore, applyReorder, applyMove } from './tasks.store';
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

  describe('reorderTask', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should optimistically reorder task within same column', async () => {
      // task-1 is at position 0 in 'todo', task-2 is at position 1 in 'todo'
      const updatedTask = { ...mockTasks[0], position: 1 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.reorderTask({ organizationId, taskId: 'task-1', newPosition: 1 });

      // Optimistic update should happen immediately
      const task1 = store.tasks().find((t) => t.id === 'task-1');
      expect(task1?.position).toBe(1);

      await flush();

      expect(tasksServiceMock.updateTask).toHaveBeenCalledWith(
        organizationId,
        'task-1',
        { position: 1 },
      );
    });

    it('should rollback on reorder failure', async () => {
      const errorResponse = { error: { message: 'Reorder failed' } };
      tasksServiceMock.updateTask.mockReturnValue(throwError(() => errorResponse));

      const originalPosition = store.tasks().find((t) => t.id === 'task-1')?.position;

      store.reorderTask({ organizationId, taskId: 'task-1', newPosition: 1 });
      await flush();

      // Should rollback to original position
      const task1 = store.tasks().find((t) => t.id === 'task-1');
      expect(task1?.position).toBe(originalPosition);
      expect(store.error()).toBe('Reorder failed');
    });

    it('should not call API if position unchanged', async () => {
      store.reorderTask({ organizationId, taskId: 'task-1', newPosition: 0 });
      await flush();

      expect(tasksServiceMock.updateTask).not.toHaveBeenCalled();
    });

    it('should not reorder if task not found', async () => {
      store.reorderTask({ organizationId, taskId: 'non-existent', newPosition: 1 });
      await flush();

      expect(tasksServiceMock.updateTask).not.toHaveBeenCalled();
    });

    it('should update selectedTask if it matches reordered task', async () => {
      store.selectTask(mockTasks[0]);
      const updatedTask = { ...mockTasks[0], position: 1 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.reorderTask({ organizationId, taskId: 'task-1', newPosition: 1 });
      await flush();

      expect(store.selectedTask()?.position).toBe(1);
    });
  });

  describe('moveTask', () => {
    beforeEach(async () => {
      tasksServiceMock.getTasks.mockReturnValue(of(mockTasks));
      store.loadTasks({ organizationId });
      await flush();
    });

    it('should optimistically move task to different column', async () => {
      const updatedTask = { ...mockTasks[0], status: 'in_progress' as TaskStatus, position: 1 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.moveTask({
        organizationId,
        taskId: 'task-1',
        status: 'in_progress',
        newPosition: 1,
      });

      // Optimistic update should happen immediately
      const task1 = store.tasks().find((t) => t.id === 'task-1');
      expect(task1?.status).toBe('in_progress');
      expect(task1?.position).toBe(1);

      await flush();

      expect(tasksServiceMock.updateTask).toHaveBeenCalledWith(
        organizationId,
        'task-1',
        { status: 'in_progress', position: 1 },
      );
    });

    it('should move task without explicit position (auto-calculates end position)', async () => {
      // When no position is provided, moveTask places the task at the end of the
      // target column by computing max(existingPositions) + 1
      // The 'done' column has tasks at positions 0 and 1, so effectivePosition = 2
      const updatedTask = { ...mockTasks[0], status: 'done' as TaskStatus, position: 2 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.moveTask({
        organizationId,
        taskId: 'task-1',
        status: 'done',
      });
      await flush();

      expect(tasksServiceMock.updateTask).toHaveBeenCalledWith(
        organizationId,
        'task-1',
        { status: 'done', position: 2 },
      );
    });

    it('should rollback on move failure', async () => {
      const errorResponse = { error: { message: 'Move failed' } };
      tasksServiceMock.updateTask.mockReturnValue(throwError(() => errorResponse));

      const originalTask = store.tasks().find((t) => t.id === 'task-1');

      store.moveTask({
        organizationId,
        taskId: 'task-1',
        status: 'done',
        newPosition: 0,
      });
      await flush();

      // Should rollback to original state
      const task1 = store.tasks().find((t) => t.id === 'task-1');
      expect(task1?.status).toBe(originalTask?.status);
      expect(store.error()).toBe('Move failed');
    });

    it('should not move if task not found', async () => {
      store.moveTask({
        organizationId,
        taskId: 'non-existent',
        status: 'done',
        newPosition: 0,
      });
      await flush();

      expect(tasksServiceMock.updateTask).not.toHaveBeenCalled();
    });

    it('should use applyReorder when moving within same status', async () => {
      // task-1 is 'todo' at position 0, task-2 is 'todo' at position 1
      const updatedTask = { ...mockTasks[0], position: 1 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.moveTask({
        organizationId,
        taskId: 'task-1',
        status: 'todo', // same status
        newPosition: 1,
      });

      // Should reorder within column
      const task1 = store.tasks().find((t) => t.id === 'task-1');
      expect(task1?.position).toBe(1);
      expect(task1?.status).toBe('todo');

      await flush();
    });

    it('should update selectedTask if it matches moved task', async () => {
      store.selectTask(mockTasks[0]);
      const updatedTask = { ...mockTasks[0], status: 'done' as TaskStatus, position: 2 };
      tasksServiceMock.updateTask.mockReturnValue(of(updatedTask));

      store.moveTask({
        organizationId,
        taskId: 'task-1',
        status: 'done',
        newPosition: 2,
      });
      await flush();

      expect(store.selectedTask()?.status).toBe('done');
      expect(store.selectedTask()?.position).toBe(2);
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper Function Tests (Pure functions, tested in isolation)
// ─────────────────────────────────────────────────────────────────────────────

describe('applyReorder', () => {
  const baseTasks: ITask[] = [
    { id: 't1', status: 'todo' as TaskStatus, position: 0 } as ITask,
    { id: 't2', status: 'todo' as TaskStatus, position: 1 } as ITask,
    { id: 't3', status: 'todo' as TaskStatus, position: 2 } as ITask,
    { id: 't4', status: 'done' as TaskStatus, position: 0 } as ITask,
  ];

  it('should return original array if task not found', () => {
    const result = applyReorder(baseTasks, 'non-existent', 1);
    expect(result).toBe(baseTasks);
  });

  it('should return original array if position unchanged', () => {
    const result = applyReorder(baseTasks, 't1', 0);
    expect(result).toBe(baseTasks);
  });

  it('should move task down (position 0 → 2)', () => {
    const result = applyReorder(baseTasks, 't1', 2);

    expect(result.find(t => t.id === 't1')?.position).toBe(2);
    expect(result.find(t => t.id === 't2')?.position).toBe(0); // shifted down
    expect(result.find(t => t.id === 't3')?.position).toBe(1); // shifted down
    // Different status unaffected
    expect(result.find(t => t.id === 't4')?.position).toBe(0);
  });

  it('should move task up (position 2 → 0)', () => {
    const result = applyReorder(baseTasks, 't3', 0);

    expect(result.find(t => t.id === 't3')?.position).toBe(0);
    expect(result.find(t => t.id === 't1')?.position).toBe(1); // shifted up
    expect(result.find(t => t.id === 't2')?.position).toBe(2); // shifted up
  });

  it('should move task to middle position (1 → 2)', () => {
    const result = applyReorder(baseTasks, 't2', 2);

    expect(result.find(t => t.id === 't1')?.position).toBe(0); // unaffected
    expect(result.find(t => t.id === 't2')?.position).toBe(2);
    expect(result.find(t => t.id === 't3')?.position).toBe(1); // shifted down
  });

  it('should not affect tasks in different status columns', () => {
    const tasks: ITask[] = [
      { id: 't1', status: 'todo' as TaskStatus, position: 0 } as ITask,
      { id: 't2', status: 'todo' as TaskStatus, position: 1 } as ITask,
      { id: 't3', status: 'in_progress' as TaskStatus, position: 0 } as ITask,
      { id: 't4', status: 'in_progress' as TaskStatus, position: 1 } as ITask,
    ];

    const result = applyReorder(tasks, 't1', 1);

    // in_progress tasks should be unchanged
    expect(result.find(t => t.id === 't3')?.position).toBe(0);
    expect(result.find(t => t.id === 't4')?.position).toBe(1);
  });

  it('should return new array (immutable)', () => {
    const result = applyReorder(baseTasks, 't1', 2);
    expect(result).not.toBe(baseTasks);
  });
});

describe('applyMove', () => {
  const baseTasks: ITask[] = [
    { id: 't1', status: 'todo' as TaskStatus, position: 0 } as ITask,
    { id: 't2', status: 'todo' as TaskStatus, position: 1 } as ITask,
    { id: 't3', status: 'in_progress' as TaskStatus, position: 0 } as ITask,
    { id: 't4', status: 'in_progress' as TaskStatus, position: 1 } as ITask,
  ];

  it('should return original array if task not found', () => {
    const result = applyMove(baseTasks, 'non-existent', 'done', 0);
    expect(result).toBe(baseTasks);
  });

  it('should delegate to applyReorder when status unchanged', () => {
    const result = applyMove(baseTasks, 't1', 'todo', 1);

    // Should reorder within column
    expect(result.find(t => t.id === 't1')?.status).toBe('todo');
    expect(result.find(t => t.id === 't1')?.position).toBe(1);
    expect(result.find(t => t.id === 't2')?.position).toBe(0);
  });

  it('should move task to different column at position 0', () => {
    const result = applyMove(baseTasks, 't1', 'in_progress', 0);

    // Task moved to in_progress at position 0
    const movedTask = result.find(t => t.id === 't1');
    expect(movedTask?.status).toBe('in_progress');
    expect(movedTask?.position).toBe(0);

    // Original todo column: t2 shifts down
    expect(result.find(t => t.id === 't2')?.position).toBe(0);

    // Target in_progress column: existing tasks shift up
    expect(result.find(t => t.id === 't3')?.position).toBe(1);
    expect(result.find(t => t.id === 't4')?.position).toBe(2);
  });

  it('should move task to end of different column', () => {
    const result = applyMove(baseTasks, 't1', 'in_progress', 2);

    // Task moved to in_progress at position 2
    const movedTask = result.find(t => t.id === 't1');
    expect(movedTask?.status).toBe('in_progress');
    expect(movedTask?.position).toBe(2);

    // Original todo column: t2 shifts down
    expect(result.find(t => t.id === 't2')?.position).toBe(0);

    // Target column: no tasks at position >= 2, so no shifts
    expect(result.find(t => t.id === 't3')?.position).toBe(0);
    expect(result.find(t => t.id === 't4')?.position).toBe(1);
  });

  it('should move task to middle of different column', () => {
    const result = applyMove(baseTasks, 't1', 'in_progress', 1);

    // Task moved to in_progress at position 1
    const movedTask = result.find(t => t.id === 't1');
    expect(movedTask?.status).toBe('in_progress');
    expect(movedTask?.position).toBe(1);

    // Original todo column: t2 shifts down (from 1 to 0)
    expect(result.find(t => t.id === 't2')?.position).toBe(0);

    // Target column: t3 unaffected (position 0 < 1), t4 shifts up
    expect(result.find(t => t.id === 't3')?.position).toBe(0);
    expect(result.find(t => t.id === 't4')?.position).toBe(2);
  });

  it('should move task to empty column', () => {
    const tasks: ITask[] = [
      { id: 't1', status: 'todo' as TaskStatus, position: 0 } as ITask,
      { id: 't2', status: 'todo' as TaskStatus, position: 1 } as ITask,
    ];

    const result = applyMove(tasks, 't1', 'done', 0);

    const movedTask = result.find(t => t.id === 't1');
    expect(movedTask?.status).toBe('done');
    expect(movedTask?.position).toBe(0);

    // t2 shifts down in todo column
    expect(result.find(t => t.id === 't2')?.position).toBe(0);
  });

  it('should return new array (immutable)', () => {
    const result = applyMove(baseTasks, 't1', 'in_progress', 0);
    expect(result).not.toBe(baseTasks);
  });

  it('should handle moving last task from column', () => {
    const tasks: ITask[] = [
      { id: 't1', status: 'todo' as TaskStatus, position: 0 } as ITask,
      { id: 't2', status: 'in_progress' as TaskStatus, position: 0 } as ITask,
    ];

    const result = applyMove(tasks, 't1', 'in_progress', 0);

    expect(result.find(t => t.id === 't1')?.status).toBe('in_progress');
    expect(result.find(t => t.id === 't1')?.position).toBe(0);
    expect(result.find(t => t.id === 't2')?.position).toBe(1);
  });
});
