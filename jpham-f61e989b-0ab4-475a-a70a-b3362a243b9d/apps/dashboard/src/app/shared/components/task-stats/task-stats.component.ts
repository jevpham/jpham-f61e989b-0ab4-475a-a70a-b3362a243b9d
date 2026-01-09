import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksStore } from '../../../store/tasks/tasks.store';

@Component({
  selector: 'app-task-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Progress</h3>

      <!-- Progress Bar -->
      <div class="mb-4">
        <div class="flex justify-between text-sm mb-1">
          <span class="text-gray-600 dark:text-gray-400">Completion Rate</span>
          <span class="text-gray-900 dark:text-white font-medium">{{ tasksStore.completionRate() }}%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            class="bg-green-500 h-2.5 rounded-full transition-all duration-300"
            [style.width.%]="tasksStore.completionRate()"
          ></div>
        </div>
      </div>

      <!-- Status Breakdown -->
      <div class="space-y-3">
        @for (stat of statusStats(); track stat.status) {
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                class="w-3 h-3 rounded-full"
                [ngClass]="stat.color"
              ></div>
              <span class="text-sm text-gray-600 dark:text-gray-400">{{ stat.label }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ stat.count }}</span>
              <div class="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full transition-all duration-300"
                  [ngClass]="stat.color"
                  [style.width.%]="getPercentage(stat.count)"
                ></div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Total -->
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600 dark:text-gray-400">Total Tasks</span>
          <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ tasksStore.taskCount() }}</span>
        </div>
      </div>
    </div>
  `,
})
export class TaskStatsComponent {
  protected readonly tasksStore = inject(TasksStore);

  statusStats() {
    return [
      { status: 'todo', label: 'To Do', count: this.tasksStore.todoTasks().length, color: 'bg-gray-400' },
      { status: 'in_progress', label: 'In Progress', count: this.tasksStore.inProgressTasks().length, color: 'bg-blue-500' },
      { status: 'review', label: 'Review', count: this.tasksStore.reviewTasks().length, color: 'bg-yellow-500' },
      { status: 'done', label: 'Done', count: this.tasksStore.doneTasks().length, color: 'bg-green-500' },
    ];
  }

  getPercentage(count: number): number {
    const total = this.tasksStore.taskCount();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}
