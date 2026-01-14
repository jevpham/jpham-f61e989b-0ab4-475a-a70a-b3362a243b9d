import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TasksStore } from '../../../store/tasks/tasks.store';

// Generate unique ID for SVG gradients to avoid collisions across component instances
let gradientIdCounter = 0;

@Component({
  selector: 'app-task-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-slate-800/80 rounded-2xl shadow-soft border border-slate-200/60 dark:border-slate-700/40 overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700/40">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <svg class="w-5 h-5 text-white" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Task Progress
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Your completion overview
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Completion Rate Circle -->
        <div class="flex items-center justify-center mb-6">
          <div class="relative w-32 h-32">
            @if (tasksStore.taskCount() === 0) {
              <!-- Empty state - no tasks -->
              <svg class="w-full h-full">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="12"
                  fill="none"
                  class="text-slate-100 dark:text-slate-700"
                  stroke-dasharray="8 4"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <svg class="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  No tasks
                </span>
              </div>
            } @else {
              <!-- Progress ring -->
              <svg class="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="12"
                  fill="none"
                  class="text-slate-100 dark:text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  [attr.stroke]="'url(#' + gradientId + ')'"
                  stroke-width="12"
                  fill="none"
                  stroke-linecap="round"
                  class="transition-all duration-500 ease-out"
                  [style.stroke-dasharray]="circumference"
                  [style.stroke-dashoffset]="strokeDashoffset()"
                />
                <defs>
                  <linearGradient [attr.id]="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#34d399" />
                    <stop offset="100%" stop-color="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
              <!-- Center text -->
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="font-display text-3xl font-bold text-slate-900 dark:text-white">
                  {{ tasksStore.completionRate() }}%
                </span>
                <span class="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Complete
                </span>
              </div>
            }
          </div>
        </div>

        <!-- Status Breakdown -->
        <div class="space-y-3">
          @for (stat of statusStats(); track stat.status) {
            <div class="group flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors">
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
                  [ngClass]="stat.ringColor"
                  [class]="stat.bgColor"
                ></div>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ stat.label }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ stat.count }}</span>
                <div class="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    class="h-1.5 rounded-full progress-bar"
                    [ngClass]="stat.bgColor"
                    [style.width.%]="getPercentage(stat.count)"
                  ></div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/40">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="text-sm text-slate-500 dark:text-slate-400">Total Tasks</span>
          </div>
          <span class="font-display text-xl font-bold text-slate-900 dark:text-white">
            {{ tasksStore.taskCount() }}
          </span>
        </div>
      </div>
    </div>
  `,
})
export class TaskStatsComponent {
  protected readonly tasksStore = inject(TasksStore);

  // Unique gradient ID for this component instance to avoid SVG ID collisions
  protected readonly gradientId = `progressGradient-${++gradientIdCounter}`;

  protected readonly circumference = 2 * Math.PI * 56;

  protected readonly strokeDashoffset = computed(() => {
    const rate = this.tasksStore.completionRate();
    return this.circumference - (rate / 100) * this.circumference;
  });

  statusStats() {
    return [
      {
        status: 'todo',
        label: 'To Do',
        count: this.tasksStore.todoTasks().length,
        bgColor: 'bg-slate-400',
        ringColor: 'ring-slate-400',
      },
      {
        status: 'in_progress',
        label: 'In Progress',
        count: this.tasksStore.inProgressTasks().length,
        bgColor: 'bg-blue-500',
        ringColor: 'ring-blue-500',
      },
      {
        status: 'review',
        label: 'Review',
        count: this.tasksStore.reviewTasks().length,
        bgColor: 'bg-amber-500',
        ringColor: 'ring-amber-500',
      },
      {
        status: 'done',
        label: 'Done',
        count: this.tasksStore.doneTasks().length,
        bgColor: 'bg-emerald-500',
        ringColor: 'ring-emerald-500',
      },
    ];
  }

  getPercentage(count: number): number {
    const total = this.tasksStore.taskCount();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }
}
