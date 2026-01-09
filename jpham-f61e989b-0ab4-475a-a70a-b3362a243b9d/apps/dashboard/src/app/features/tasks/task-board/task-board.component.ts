import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
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
    TaskCardComponent,
    TaskFormComponent,
  ],
  template: `
    <div class="min-h-screen gradient-mesh-light dark:gradient-mesh-dark grain-overlay">
      <!-- Header -->
      <header class="glass-card border-b border-slate-200/60 dark:border-slate-700/40 sticky top-0 z-40">
        <div class="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-5 animate-fade-in-up">
              <a
                routerLink="/dashboard"
                class="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200"
              >
                <svg class="h-5 w-5 transition-transform group-hover:-translate-x-0.5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
              <div>
                <h1 class="font-display text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  Task Board
                </h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {{ tasksStore.taskCount() }} tasks across {{ columns.length }} columns
                </p>
              </div>
            </div>
            <button
              (click)="openCreateModal()"
              class="btn-primary gap-2 animate-fade-in-up stagger-2"
            >
              <svg class="w-4 h-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Task</span>
            </button>
          </div>
        </div>
      </header>

      @if (tasksStore.error()) {
        <div class="max-w-7xl mx-auto mt-6 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
          <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 shrink-0 mt-0.5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm text-red-700 dark:text-red-300">{{ tasksStore.error() }}</p>
          </div>
        </div>
      }

      <!-- Task board -->
      <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        @if (tasksStore.isLoading()) {
          <div class="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div class="relative">
              <div class="w-12 h-12 rounded-full border-3 border-slate-200 dark:border-slate-700"></div>
              <div class="absolute inset-0 w-12 h-12 rounded-full border-3 border-transparent border-t-amber-500 animate-spin"></div>
            </div>
            <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading tasks...</p>
          </div>
        } @else {
          <div cdkDropListGroup class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            @for (column of columns; track column.status; let i = $index) {
              <div
                class="kanban-column rounded-2xl p-4 min-h-[500px] flex flex-col animate-fade-in-up"
                [class]="'stagger-' + (i + 1)"
              >
                <!-- Column Header -->
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-700/40">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center"
                      [ngClass]="column.accentColor"
                    >
                      <span class="text-base" [innerHTML]="column.icon"></span>
                    </div>
                    <h3 class="font-display font-medium text-slate-800 dark:text-slate-200">
                      {{ column.title }}
                    </h3>
                  </div>
                  <span
                    class="badge"
                    [ngClass]="column.badgeClasses"
                  >
                    {{ tasksByStatus()[column.status].length }}
                  </span>
                </div>

                <!-- Drop Zone -->
                <div
                  cdkDropList
                  [cdkDropListData]="tasksByStatus()[column.status]"
                  [id]="column.status"
                  (cdkDropListDropped)="onDrop($event)"
                  class="flex-1 space-y-3 min-h-[100px] rounded-xl transition-colors duration-200"
                  [class.bg-amber-50/50]="false"
                  [class.dark:bg-amber-900/10]="false"
                >
                  @for (task of tasksByStatus()[column.status]; track task.id; let j = $index) {
                    <div
                      cdkDrag
                      [cdkDragData]="task"
                      class="animate-fade-in-up"
                      [style.animation-delay.ms]="j * 50"
                    >
                      <app-task-card
                        [task]="task"
                        (edit)="openEditModal($event)"
                      />
                    </div>
                  } @empty {
                    <div class="flex flex-col items-center justify-center py-12 text-center">
                      <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <svg class="w-6 h-6 text-slate-400" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p class="text-sm text-slate-400 dark:text-slate-500">No tasks yet</p>
                      <p class="text-xs text-slate-400/70 dark:text-slate-500/70 mt-1">Drop tasks here</p>
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
    // We don't mutate signal arrays directly - the store handles all state changes
    if (previousStatus !== newStatus) {
      this.tasksStore.updateTaskStatus(organizationId, task.id, newStatus);
    }
    // Note: Reordering within the same column would require a position update API
    // which is not implemented. The visual reorder will reset on next data refresh.
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

  onSave(dto: CreateTaskDto | UpdateTaskDto) {
    const organizationId = this.authStore.organizationId();
    if (!organizationId) return;

    const task = this.selectedTask();
    if (task) {
      this.tasksStore.updateTask({
        organizationId,
        taskId: task.id,
        dto: dto as UpdateTaskDto,
      });
    } else {
      this.tasksStore.createTask({
        organizationId,
        dto: dto as CreateTaskDto,
      });
    }
    this.closeForm();
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
