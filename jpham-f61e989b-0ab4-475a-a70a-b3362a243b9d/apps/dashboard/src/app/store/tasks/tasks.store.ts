import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, concatMap, catchError, of } from 'rxjs';
import { TasksService, TaskFilters } from '../../core/services/tasks.service';
import {
  ITask,
  TaskStatus,
  CreateTaskDto,
  UpdateTaskDto,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

/**
 * Reorders a task within its status column by adjusting positions.
 * Used for optimistic updates during drag-and-drop within the same column.
 * @internal Exported for testing
 */
export const applyReorder = (
  tasks: ITask[],
  taskId: string,
  newPosition: number,
): ITask[] => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return tasks;
  }

  const oldPosition = task.position;
  if (oldPosition === newPosition) {
    return tasks;
  }

  const status = task.status;

  return tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, position: newPosition };
    }

    if (t.status !== status) {
      return t;
    }

    if (newPosition > oldPosition) {
      if (t.position > oldPosition && t.position <= newPosition) {
        return { ...t, position: t.position - 1 };
      }
    } else if (newPosition < oldPosition) {
      if (t.position >= newPosition && t.position < oldPosition) {
        return { ...t, position: t.position + 1 };
      }
    }

    return t;
  });
};

/**
 * Moves a task to a different status column, adjusting positions in both columns.
 * Decrements positions in old column (for tasks after), increments in new column (for tasks at/after).
 * @internal Exported for testing
 */
export const applyMove = (
  tasks: ITask[],
  taskId: string,
  newStatus: TaskStatus,
  newPosition: number,
): ITask[] => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return tasks;
  }

  const oldStatus = task.status;
  const oldPosition = task.position;

  if (oldStatus === newStatus) {
    return applyReorder(tasks, taskId, newPosition);
  }

  return tasks.map((t) => {
    if (t.id === taskId) {
      return { ...t, status: newStatus, position: newPosition };
    }

    if (t.status === oldStatus && t.position > oldPosition) {
      return { ...t, position: t.position - 1 };
    }

    if (t.status === newStatus && t.position >= newPosition) {
      return { ...t, position: t.position + 1 };
    }

    return t;
  });
};

interface TasksState {
  tasks: ITask[];
  selectedTask: ITask | null;
  filters: TaskFilters;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

/**
 * Extracts error message from API error response with fallback.
 */
const extractErrorMessage = (
  error: { error?: { message?: string } },
  fallback: string,
): string => error.error?.message || fallback;

const initialState: TasksState = {
  tasks: [],
  selectedTask: null,
  filters: {},
  isLoading: false,
  isSaving: false,
  error: null,
};

export const TasksStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => {
    // Single pass grouping - more efficient than multiple filter calls
    const tasksByStatus = computed(() => {
      const tasks = state.tasks();
      const grouped: Record<TaskStatus, ITask[]> = {
        todo: [],
        in_progress: [],
        review: [],
        done: [],
      };
      for (const task of tasks) {
        grouped[task.status].push(task);
      }
      for (const status of Object.keys(grouped) as TaskStatus[]) {
        grouped[status].sort((a, b) => a.position - b.position);
      }
      return grouped;
    });

    return {
      // Derived from single grouping computation
      todoTasks: computed(() => tasksByStatus().todo),
      inProgressTasks: computed(() => tasksByStatus().in_progress),
      reviewTasks: computed(() => tasksByStatus().review),
      doneTasks: computed(() => tasksByStatus().done),
      taskCount: computed(() => state.tasks().length),
      // Reuse doneTasks instead of filtering again
      completedCount: computed(() => tasksByStatus().done.length),
      completionRate: computed(() => {
        const total = state.tasks().length;
        if (total === 0) return 0;
        const completed = tasksByStatus().done.length;
        return Math.round((completed / total) * 100);
      }),
    };
  }),
  withMethods((store) => {
    const tasksService = inject(TasksService);

    return {
      loadTasks: rxMethod<{ organizationId: string; filters?: TaskFilters }>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap(({ organizationId, filters }) =>
            tasksService.getTasks(organizationId, filters).pipe(
              tap((tasks) => {
                patchState(store, {
                  tasks,
                  filters: filters ?? {},
                  isLoading: false,
                });
              }),
              catchError((error) => {
                patchState(store, {
                  isLoading: false,
                  error: extractErrorMessage(error, 'Failed to load tasks'),
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      createTask: rxMethod<{ organizationId: string; dto: CreateTaskDto }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null })),
          switchMap(({ organizationId, dto }) =>
            tasksService.createTask(organizationId, dto).pipe(
              tap((task) => {
                patchState(store, {
                  tasks: [...store.tasks(), task],
                  isSaving: false,
                });
              }),
              catchError((error) => {
                patchState(store, {
                  isSaving: false,
                  error: extractErrorMessage(error, 'Failed to create task'),
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      updateTask: rxMethod<{
        organizationId: string;
        taskId: string;
        dto: UpdateTaskDto;
      }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null })),
          // Use concatMap to serialize updates - prevents race conditions when
          // rapidly updating multiple tasks (e.g., drag-and-drop reordering)
          concatMap(({ organizationId, taskId, dto }) =>
            tasksService.updateTask(organizationId, taskId, dto).pipe(
              tap((updatedTask) => {
                patchState(store, {
                  tasks: store.tasks().map((t) =>
                    t.id === taskId ? updatedTask : t,
                  ),
                  selectedTask:
                    store.selectedTask()?.id === taskId
                      ? updatedTask
                      : store.selectedTask(),
                  isSaving: false,
                });
              }),
              catchError((error) => {
                patchState(store, {
                  isSaving: false,
                  error: extractErrorMessage(error, 'Failed to update task'),
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      deleteTask: rxMethod<{ organizationId: string; taskId: string }>(
        pipe(
          tap(() => patchState(store, { isSaving: true, error: null })),
          switchMap(({ organizationId, taskId }) =>
            tasksService.deleteTask(organizationId, taskId).pipe(
              tap(() => {
                patchState(store, {
                  tasks: store.tasks().filter((t) => t.id !== taskId),
                  selectedTask:
                    store.selectedTask()?.id === taskId
                      ? null
                      : store.selectedTask(),
                  isSaving: false,
                });
              }),
              catchError((error) => {
                patchState(store, {
                  isSaving: false,
                  error: extractErrorMessage(error, 'Failed to delete task'),
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      reorderTask: rxMethod<{
        organizationId: string;
        taskId: string;
        newPosition: number;
      }>(
        pipe(
          concatMap(({ organizationId, taskId, newPosition }) => {
            // Capture current state for rollback on error
            const previousTasks = store.tasks();
            const task = previousTasks.find((t) => t.id === taskId);

            if (!task) {
              return of(null);
            }

            const oldPosition = task.position;

            // Skip if position unchanged
            if (oldPosition === newPosition) {
              return of(null);
            }

            // Optimistic update: immediately reorder in UI
            const optimisticTasks = applyReorder(previousTasks, taskId, newPosition);

            patchState(store, { tasks: optimisticTasks, isSaving: true });

            return tasksService.updateTask(organizationId, taskId, { position: newPosition }).pipe(
              tap((updatedTask) => {
                // Update with server response
                patchState(store, {
                  tasks: store.tasks().map((t) =>
                    t.id === taskId ? updatedTask : t,
                  ),
                  selectedTask:
                    store.selectedTask()?.id === taskId
                      ? updatedTask
                      : store.selectedTask(),
                  isSaving: false,
                });
              }),
              catchError((error) => {
                // Rollback to previous state on error
                patchState(store, {
                  tasks: previousTasks,
                  isSaving: false,
                  error: extractErrorMessage(error, 'Failed to reorder task'),
                });
                return of(null);
              }),
            );
          }),
        ),
      ),

      moveTask: rxMethod<{
        organizationId: string;
        taskId: string;
        status: TaskStatus;
        newPosition?: number;
      }>(
        pipe(
          concatMap(({ organizationId, taskId, status, newPosition }) => {
            // Capture previous state for rollback
            const previousTasks = store.tasks();
            const previousSelectedTask = store.selectedTask();
            const task = previousTasks.find((t) => t.id === taskId);
            if (!task) {
              return of(null);
            }

            // If newPosition is undefined for cross-column moves, compute end index
            // to avoid duplicate positions in the target column
            let effectivePosition = newPosition;
            if (effectivePosition === undefined) {
              // Place task at the end of the target column using max position + 1
              // (positions may not be sequential after multiple reorderings)
              const targetColumnTasks = previousTasks.filter((t) => t.status === status);
              effectivePosition = targetColumnTasks.length > 0
                ? Math.max(...targetColumnTasks.map((t) => t.position)) + 1
                : 0;
            }

            const optimisticTasks = applyMove(previousTasks, taskId, status, effectivePosition);

            patchState(store, {
              tasks: optimisticTasks,
              selectedTask:
                store.selectedTask()?.id === taskId
                  ? { ...task, status, position: effectivePosition }
                  : store.selectedTask(),
              isSaving: true,
              error: null,
            });

            return tasksService
              .updateTask(organizationId, taskId, {
                status,
                position: effectivePosition,
              })
              .pipe(
                tap((updatedTask) => {
                  patchState(store, {
                    tasks: store.tasks().map((t) =>
                      t.id === taskId ? updatedTask : t,
                    ),
                    selectedTask:
                      store.selectedTask()?.id === taskId
                        ? updatedTask
                        : store.selectedTask(),
                    isSaving: false,
                  });
                }),
                catchError((error) => {
                  // Rollback both tasks and selectedTask to previous state
                  patchState(store, {
                    tasks: previousTasks,
                    selectedTask: previousSelectedTask,
                    isSaving: false,
                    error: extractErrorMessage(error, 'Failed to move task'),
                  });
                  return of(null);
                }),
              );
          }),
        ),
      ),

      selectTask(task: ITask | null) {
        patchState(store, { selectedTask: task });
      },

      setFilters(filters: TaskFilters) {
        patchState(store, { filters });
      },

      clearError() {
        patchState(store, { error: null });
      },
    };
  }),
);
