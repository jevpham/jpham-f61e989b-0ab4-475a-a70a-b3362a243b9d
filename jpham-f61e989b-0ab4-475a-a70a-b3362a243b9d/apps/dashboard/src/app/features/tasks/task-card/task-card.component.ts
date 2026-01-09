import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ITask, TaskPriority } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
};

@Component({
  selector: 'app-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow"
      (click)="onEdit()"
    >
      <div class="flex items-start justify-between mb-2">
        <h4 class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
          {{ task().title }}
        </h4>
        <span
          class="ml-2 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap"
          [ngClass]="priorityClass()"
        >
          {{ task().priority }}
        </span>
      </div>

      @if (task().description) {
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {{ task().description }}
        </p>
      }

      <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        @if (task().dueDate) {
          <span [class.text-red-500]="isOverdue()">
            {{ task().dueDate | date:'MMM d' }}
          </span>
        } @else {
          <span>No due date</span>
        }

        @if (task().assignee) {
          <span class="truncate max-w-[100px]" [title]="task().assignee!.email">
            {{ task().assignee!.email.split('@')[0] }}
          </span>
        }
      </div>
    </div>
  `,
})
export class TaskCardComponent {
  // Signal-based input for better performance with OnPush
  readonly task = input.required<ITask>();
  readonly edit = output<ITask>();

  // Computed signals for derived values
  protected readonly priorityClass = computed(() => PRIORITY_CLASSES[this.task().priority]);

  protected readonly isOverdue = computed(() => {
    const dueDate = this.task().dueDate;
    if (!dueDate) return false;
    const date = new Date(dueDate);
    return !isNaN(date.getTime()) && date < new Date();
  });

  onEdit() {
    this.edit.emit(this.task());
  }
}
