import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { TasksService, TaskFilters } from '../../core/services/tasks.service';
import {
  ITask,
  TaskStatus,
  CreateTaskDto,
  UpdateTaskDto,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

interface TasksState {
  tasks: ITask[];
  selectedTask: ITask | null;
  filters: TaskFilters;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

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
                  error: error.error?.message || 'Failed to load tasks',
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
                  error: error.error?.message || 'Failed to create task',
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
          switchMap(({ organizationId, taskId, dto }) =>
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
                  error: error.error?.message || 'Failed to update task',
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
                  error: error.error?.message || 'Failed to delete task',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      updateTaskStatus(
        organizationId: string,
        taskId: string,
        status: TaskStatus,
      ) {
        this.updateTask({ organizationId, taskId, dto: { status } });
      },

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
