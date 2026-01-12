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
          <button
            (click)="openCreateModal()"
            class="btn-primary create-btn"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Task</span>
          </button>
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
        (save)="onSave($event)"
        (delete)="onDelete()"
        (cancel)="closeForm()"
      />
    }
  `,
  styles: [`
    /* ===========================================
       TASK BOARD COMPONENT STYLES
       Using CSS variables from design system
       =========================================== */

    /* Base Container - Full viewport coverage */
    .task-board-container {
      min-height: 100vh;
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--color-primary-50);
      position: relative;
      overflow: hidden;
    }

    :host-context(.dark) .task-board-container {
      background: var(--color-primary-950);
    }

    /* Header content layout */
    .board-header .header-content {
      max-width: 100%;
      margin: 0 auto;
      padding: var(--space-lg) var(--space-2xl);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2xl);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-lg);
    }

    .back-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-100);
      border-radius: var(--radius-md);
      color: var(--color-primary-500);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: #fef3c7;
      color: #d97706;
    }

    :host-context(.dark) .back-btn {
      background: var(--color-primary-800);
      color: var(--color-primary-400);
    }

    :host-context(.dark) .back-btn:hover {
      background: rgba(217, 119, 6, 0.2);
      color: #fbbf24;
    }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .board-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-primary-900);
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.2;
    }

    :host-context(.dark) .board-title {
      color: var(--color-primary-50);
    }

    .board-subtitle {
      font-family: var(--font-body);
      font-size: 0.8125rem;
      color: var(--color-primary-500);
      margin: 0.125rem 0 0;
    }

    .create-btn {
      gap: var(--space-sm);
    }

    /* Error Banner */
    .error-banner {
      margin: var(--space-lg) var(--space-2xl);
      padding: var(--space-lg);
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      gap: var(--space-md);
      color: #dc2626;
    }

    :host-context(.dark) .error-banner {
      background: rgba(220, 38, 38, 0.1);
      border-color: rgba(220, 38, 38, 0.3);
    }

    .error-banner p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Main Board Area - Fills remaining space */
    .board-main {
      flex: 1;
      position: relative;
      z-index: var(--z-content);
      padding: var(--space-xl) var(--space-2xl) var(--space-2xl);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Loading State - uses global spinner */
    .loading-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-lg);
    }

    .loading-state p {
      font-family: var(--font-body);
      font-size: 0.875rem;
      color: var(--color-primary-500);
      margin: 0;
    }

    /* Columns Grid - Full width, fills height */
    .columns-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-xl);
      min-height: 0;
    }

    @media (max-width: 1280px) {
      .columns-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .columns-grid {
        grid-template-columns: 1fr;
      }

      /* On mobile, let the main container scroll instead of individual columns */
      .board-main {
        overflow-y: auto;
      }

      .board-header .header-content {
        padding: var(--space-md) var(--space-lg);
      }

      .board-main {
        padding: var(--space-lg);
      }
    }

    /* Kanban Column - extends global kanban-column */
    .kanban-column {
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-xl);
      padding: var(--space-lg);
      min-height: 0;
    }

    /* Column Header */
    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: var(--space-md);
      margin-bottom: var(--space-md);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      flex-shrink: 0;
    }

    :host-context(.dark) .column-header {
      border-bottom-color: rgba(255, 255, 255, 0.06);
    }

    .column-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .column-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .column-title {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--color-primary-900);
      margin: 0;
    }

    :host-context(.dark) .column-title {
      color: var(--color-primary-50);
    }

    .column-count {
      min-width: 24px;
      height: 24px;
      padding: 0 var(--space-sm);
    }

    /* Drop Zone - Scrollable area for tasks */
    .drop-zone {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      min-height: 80px;
      overflow-y: auto;
      padding-right: var(--space-xs);
    }

    /* Custom scrollbar for drop zone */
    .drop-zone::-webkit-scrollbar {
      width: 4px;
    }

    .drop-zone::-webkit-scrollbar-thumb {
      background: var(--color-primary-300);
      border-radius: 2px;
    }

    :host-context(.dark) .drop-zone::-webkit-scrollbar-thumb {
      background: var(--color-primary-700);
    }

    /* Task Card Wrapper */
    .task-card-wrapper {
      /* Inherits animation from global animate-fade-in-up */
      position: relative;
    }

    /* Hide original card while dragging - the placeholder takes its place */
    .task-card-wrapper.cdk-drag-dragging > app-task-card {
      opacity: 0;
    }

    /* Status-specific accent colors for column icons */
    .status-todo { background: var(--status-todo-bg); }
    .status-progress { background: var(--status-progress-bg); }
    .status-review { background: var(--status-review-bg); }
    .status-done { background: var(--status-done-bg); }

    :host-context(.dark) .status-todo { background: rgba(100, 116, 139, 0.3); }
    :host-context(.dark) .status-progress { background: rgba(30, 64, 175, 0.4); }
    :host-context(.dark) .status-review { background: rgba(180, 83, 9, 0.4); }
    :host-context(.dark) .status-done { background: rgba(6, 95, 70, 0.4); }

    /* Legacy accent color support (from column config) */
    .bg-slate-100 { background: var(--status-todo-bg); }
    .bg-blue-100 { background: var(--status-progress-bg); }
    .bg-amber-100 { background: var(--status-review-bg); }
    .bg-emerald-100 { background: var(--status-done-bg); }

    :host-context(.dark) .bg-slate-100,
    :host-context(.dark) .dark\\:bg-slate-800 { background: rgba(100, 116, 139, 0.3); }
    :host-context(.dark) .bg-blue-100,
    :host-context(.dark) .dark\\:bg-blue-900\\/40 { background: rgba(30, 64, 175, 0.4); }
    :host-context(.dark) .bg-amber-100,
    :host-context(.dark) .dark\\:bg-amber-900\\/40 { background: rgba(180, 83, 9, 0.4); }
    :host-context(.dark) .bg-emerald-100,
    :host-context(.dark) .dark\\:bg-emerald-900\\/40 { background: rgba(6, 95, 70, 0.4); }

    /* Badge colors for column counts */
    .bg-slate-200 { background: #e2e8f0; color: var(--status-todo-text); }
    .bg-blue-100.text-blue-700 { background: var(--status-progress-bg); color: var(--status-progress-text); }
    .bg-amber-100.text-amber-700 { background: var(--status-review-bg); color: var(--status-review-text); }
    .bg-emerald-100.text-emerald-700 { background: var(--status-done-bg); color: var(--status-done-text); }

    :host-context(.dark) .bg-slate-200,
    :host-context(.dark) .dark\\:bg-slate-700 { background: #334155; color: #cbd5e1; }
    :host-context(.dark) .bg-blue-100.text-blue-700,
    :host-context(.dark) .dark\\:bg-blue-900\\/60 { background: rgba(30, 64, 175, 0.6); color: #93c5fd; }
    :host-context(.dark) .bg-amber-100.text-amber-700,
    :host-context(.dark) .dark\\:bg-amber-900\\/60 { background: rgba(180, 83, 9, 0.6); color: #fcd34d; }
    :host-context(.dark) .bg-emerald-100.text-emerald-700,
    :host-context(.dark) .dark\\:bg-emerald-900\\/60 { background: rgba(6, 95, 70, 0.6); color: #6ee7b7; }
  `],
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

  ngOnInit() {
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }
  }

  onDrop(event: CdkDragDrop<ITask[]>) {
    const organizationId = this.authStore.organizationId();
    if (!organizationId) return;

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
