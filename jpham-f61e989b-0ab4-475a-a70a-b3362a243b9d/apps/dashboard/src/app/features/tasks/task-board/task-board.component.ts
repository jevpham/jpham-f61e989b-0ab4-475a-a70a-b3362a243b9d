import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  CdkDragPlaceholder,
} from '@angular/cdk/drag-drop';
import { AuthStore } from '../../../store/auth/auth.store';
import { TasksStore } from '../../../store/tasks/tasks.store';
import { TaskCardComponent } from '../task-card/task-card.component';
import { TaskFormComponent } from '../task-form/task-form.component';
import {
  ITask,
  TaskStatus,
  CreateTaskDto,
  UpdateTaskDto,
  hasMinimumRole,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

interface Column {
  status: TaskStatus;
  title: string;
  icon: string;
  accentColor: string;
  badgeClasses: string;
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './task-board.component.scss',
  imports: [
    CommonModule,
    RouterLink,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragPlaceholder,
    TaskCardComponent,
    TaskFormComponent,
  ],
  template: `
    <div class="task-board-container">
      <!-- Decorative Elements - using global classes -->
      <div class="decorative-grid"></div>
      <div class="decorative-accent"></div>

      <!-- Header - using sticky-header pattern from global styles -->
      <header class="sticky-header board-header">
        <div class="header-content">
          <div class="header-left">
            <a
              routerLink="/dashboard"
              class="back-btn focus-ring"
              aria-label="Back to dashboard"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <div class="header-text">
              <h1 class="board-title font-display">Task Board</h1>
              <p class="board-subtitle">
                {{ tasksStore.taskCount() }} tasks across {{ columns.length }} columns
              </p>
            </div>
          </div>
          @if (canCreateTask()) {
            <button
              (click)="openCreateModal()"
              class="btn-primary create-btn"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Task</span>
            </button>
          }
          @if (displayRole()) {
            <div
              class="role-badge"
              role="status"
              [attr.aria-label]="'Current user role: ' + displayRole()"
              [attr.title]="'Your role: ' + displayRole()"
            >
              <span class="role-label">{{ displayRole() }}</span>
            </div>
          }
        </div>
      </header>

      @if (tasksStore.error()) {
        <div class="error-banner" role="alert">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{{ tasksStore.error() }}</p>
        </div>
      }

      <!-- Task board -->
      <main class="board-main">
        @if (tasksStore.isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner">
              <div class="loading-spinner-track"></div>
              <div class="loading-spinner-fill"></div>
            </div>
            <p>Loading tasks...</p>
          </div>
        } @else {
          <div cdkDropListGroup class="columns-grid">
            @for (column of columns; track column.status; let i = $index) {
              <div
                class="kanban-column animate-fade-in-up"
                [class]="'stagger-' + (i + 1)"
              >
                <!-- Column Header -->
                <div class="column-header">
                  <div class="column-title-group">
                    <div class="column-icon" [ngClass]="column.accentColor">
                      <span [innerHTML]="column.icon"></span>
                    </div>
                    <h3 class="column-title font-display">{{ column.title }}</h3>
                  </div>
                  <span class="badge column-count" [ngClass]="column.badgeClasses">
                    {{ tasksByStatus()[column.status].length }}
                  </span>
                </div>

                <!-- Drop Zone - disabled sorting within same column to prevent confusing UX -->
                <div
                  cdkDropList
                  [cdkDropListData]="tasksByStatus()[column.status]"
                  [cdkDropListSortingDisabled]="true"
                  [id]="column.status"
                  (cdkDropListDropped)="onDrop($event)"
                  class="drop-zone"
                  [cdkDropListConnectedTo]="columnIds"
                >
                  @for (task of tasksByStatus()[column.status]; track task.id; let j = $index) {
                    <div
                      cdkDrag
                      [cdkDragDisabled]="!canDragTasks()"
                      [cdkDragData]="task"
                      [cdkDragPreviewContainer]="'global'"
                      class="task-card-wrapper animate-fade-in-up"
                      [style.animation-delay.ms]="j * 30"
                    >
                      <!-- Placeholder - visible so CDK knows where to animate back to -->
                      <div *cdkDragPlaceholder class="drag-placeholder"></div>
                      <app-task-card
                        [task]="task"
                        (edit)="openEditModal($event)"
                      />
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <div class="empty-state-icon">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p class="empty-state-title">No tasks yet</p>
                      <p class="empty-state-subtitle">Drop tasks here</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>

    @if (showForm()) {
      <app-task-form
        [task]="selectedTask()"
        [canDelete]="canDeleteTask()"
        (save)="onSave($event)"
        (delete)="onDelete()"
        (cancel)="closeForm()"
      />
    }
  `,
})
export class TaskBoardComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly tasksStore = inject(TasksStore);

  protected readonly showForm = signal(false);
  protected readonly selectedTask = signal<ITask | null>(null);

  protected readonly columns: Column[] = [
    {
      status: 'todo',
      title: 'To Do',
      icon: '📋',
      accentColor: 'bg-slate-100 dark:bg-slate-800',
      badgeClasses: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    },
    {
      status: 'in_progress',
      title: 'In Progress',
      icon: '⚡',
      accentColor: 'bg-blue-100 dark:bg-blue-900/40',
      badgeClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300',
    },
    {
      status: 'review',
      title: 'Review',
      icon: '👀',
      accentColor: 'bg-amber-100 dark:bg-amber-900/40',
      badgeClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    },
    {
      status: 'done',
      title: 'Done',
      icon: '✅',
      accentColor: 'bg-emerald-100 dark:bg-emerald-900/40',
      badgeClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    },
  ];

  // Column IDs for connecting drop lists
  protected readonly columnIds = ['todo', 'in_progress', 'review', 'done'];

  protected readonly tasksByStatus = computed(() => ({
    todo: this.tasksStore.todoTasks(),
    in_progress: this.tasksStore.inProgressTasks(),
    review: this.tasksStore.reviewTasks(),
    done: this.tasksStore.doneTasks(),
  }));

  /**
   * RBAC: Base permission check for admin-level actions.
   * Used for create, update, delete operations.
   *
   * SECURITY NOTE: Frontend checks are for UX only.
   * All RBAC enforcement happens server-side via guards and service methods.
   */
  protected readonly hasAdminAccess = computed(() => {
    const role = this.authStore.userRole();
    return role ? hasMinimumRole(role, 'admin') : false;
  });

  // RBAC permissions derived from base check
  protected readonly canCreateTask = this.hasAdminAccess;
  protected readonly canDeleteTask = this.hasAdminAccess;
  protected readonly canEditTask = this.hasAdminAccess;
  protected readonly canDragTasks = this.hasAdminAccess;

  // Display role with null safety
  protected readonly displayRole = computed(() => {
    const role = this.authStore.userRole();
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
  });

  ngOnInit() {
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }
  }

  onDrop(event: CdkDragDrop<ITask[]>) {
    const organizationId = this.authStore.organizationId();

    // RBAC: Only admin and owner can update task status
    if (!organizationId || !this.canDragTasks()) {
      return;
    }

    const task = event.item.data as ITask;
    const newStatus = event.container.id as TaskStatus;
    const previousStatus = event.previousContainer.id as TaskStatus;

    // Only update if moving between different columns (status change)
    // Same-column sorting is disabled via [cdkDropListSortingDisabled]="true"
    if (previousStatus !== newStatus) {
      this.tasksStore.updateTaskStatus(organizationId, task.id, newStatus);
    }
  }

  openCreateModal() {
    this.selectedTask.set(null);
    this.showForm.set(true);
  }

  openEditModal(task: ITask) {
    // RBAC: Only admin and owner can edit tasks
    if (!this.canEditTask()) {
      return;
    }
    this.selectedTask.set(task);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedTask.set(null);
  }

  /**
   * Handle task save with proper type discrimination.
   * Uses the presence of selectedTask to determine if this is a create or update operation.
   */
  onSave(dto: CreateTaskDto | UpdateTaskDto) {
    const organizationId = this.authStore.organizationId();
    if (!organizationId) return;

    const task = this.selectedTask();

    if (task !== null) {
      // Update existing task - dto contains UpdateTaskDto fields
      this.tasksStore.updateTask({
        organizationId,
        taskId: task.id,
        dto: this.toUpdateDto(dto),
      });
    } else {
      // Create new task - dto contains CreateTaskDto fields
      this.tasksStore.createTask({
        organizationId,
        dto: this.toCreateDto(dto),
      });
    }
    this.closeForm();
  }

  /**
   * Type-safe conversion to UpdateTaskDto
   */
  private toUpdateDto(dto: CreateTaskDto | UpdateTaskDto): UpdateTaskDto {
    return {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      category: dto.category,
      dueDate: dto.dueDate,
      // Status is only present in UpdateTaskDto
      ...('status' in dto ? { status: dto.status } : {}),
    };
  }

  /**
   * Type-safe conversion to CreateTaskDto
   */
  private toCreateDto(dto: CreateTaskDto | UpdateTaskDto): CreateTaskDto {
    return {
      title: dto.title!,
      description: dto.description ?? undefined,
      priority: dto.priority,
      category: dto.category,
      dueDate: dto.dueDate ?? undefined,
    };
  }

  onDelete() {
    const organizationId = this.authStore.organizationId();
    const task = this.selectedTask();
    if (!organizationId || !task) return;

    this.tasksStore.deleteTask({
      organizationId,
      taskId: task.id,
    });
    this.closeForm();
  }
}
