import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
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
  color: string;
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
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/dashboard" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Task Board</h1>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ tasksStore.taskCount() }} tasks
            </span>
          </div>
          <button
            (click)="openCreateModal()"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            + New Task
          </button>
        </div>
      </header>

      @if (tasksStore.error()) {
        <div class="max-w-7xl mx-auto mt-4 px-4">
          <div class="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <p class="text-sm text-red-700 dark:text-red-200">{{ tasksStore.error() }}</p>
          </div>
        </div>
      }

      <!-- Task board -->
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        @if (tasksStore.isLoading()) {
          <div class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        } @else {
          <div cdkDropListGroup class="grid grid-cols-1 md:grid-cols-4 gap-4">
            @for (column of columns; track column.status) {
              <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 min-h-[400px]">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-gray-700 dark:text-gray-200">
                    {{ column.title }}
                  </h3>
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    [ngClass]="column.color"
                  >
                    {{ tasksByStatus()[column.status].length }}
                  </span>
                </div>

                <div
                  cdkDropList
                  [cdkDropListData]="tasksByStatus()[column.status]"
                  [id]="column.status"
                  (cdkDropListDropped)="onDrop($event)"
                  class="space-y-2 min-h-[100px]"
                >
                  @for (task of tasksByStatus()[column.status]; track task.id) {
                    <div cdkDrag [cdkDragData]="task">
                      <app-task-card
                        [task]="task"
                        (edit)="openEditModal($event)"
                      />
                    </div>
                  } @empty {
                    <div class="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      No tasks
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

  // Use signals for local state
  protected readonly showForm = signal(false);
  protected readonly selectedTask = signal<ITask | null>(null);

  protected readonly columns: Column[] = [
    { status: 'todo', title: 'To Do', color: 'bg-gray-300 text-gray-700' },
    { status: 'in_progress', title: 'In Progress', color: 'bg-blue-100 text-blue-700' },
    { status: 'review', title: 'Review', color: 'bg-yellow-100 text-yellow-700' },
    { status: 'done', title: 'Done', color: 'bg-green-100 text-green-700' },
  ];

  // Computed signal that maps tasks by status - cached and only recalculated when tasks change
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

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
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
