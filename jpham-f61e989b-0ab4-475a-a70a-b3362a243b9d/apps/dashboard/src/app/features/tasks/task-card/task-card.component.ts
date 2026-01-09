import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ITask, TaskPriority, TaskCategory } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

const PRIORITY_CONFIG: Record<TaskPriority, { classes: string; icon: string; label: string }> = {
  low: {
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    icon: '○',
    label: 'Low',
  },
  medium: {
    classes: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    icon: '◐',
    label: 'Medium',
  },
  high: {
    classes: 'bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
    icon: '●',
    label: 'High',
  },
  urgent: {
    classes: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/40',
    icon: '◉',
    label: 'Urgent',
  },
};

const CATEGORY_CONFIG: Record<TaskCategory, { classes: string; icon: string }> = {
  work: {
    classes: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
    icon: '💼',
  },
  personal: {
    classes: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: '🏠',
  },
  shopping: {
    classes: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    icon: '🛒',
  },
  health: {
    classes: 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
    icon: '❤️',
  },
  other: {
    classes: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
    icon: '📌',
  },
};

@Component({
  selector: 'app-task-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
  template: `
    <div
      class="group relative bg-white dark:bg-slate-800/80 rounded-xl cursor-pointer
             shadow-soft hover:shadow-elevated
             border border-slate-200/60 dark:border-slate-700/40
             hover:border-amber-300/60 dark:hover:border-amber-600/40
             transition-all duration-300 ease-out
             hover:-translate-y-0.5
             focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Edit task: ' + task().title"
      (click)="onEdit()"
      (keydown.enter)="onEdit()"
      (keydown.space)="onEdit(); $event.preventDefault()"
    >
      <!-- Priority indicator bar -->
      <div
        class="absolute top-0 left-4 right-4 h-0.5 rounded-full transition-all duration-300"
        [ngClass]="priorityBarColor()"
      ></div>

      <div class="p-4 pt-5">
        <!-- Header with title and badges -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <h4 class="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {{ task().title }}
          </h4>
        </div>

        <!-- Tags row -->
        <div class="flex flex-wrap gap-1.5 mb-3">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md"
            [ngClass]="categoryConfig().classes"
          >
            <span class="text-xs">{{ categoryConfig().icon }}</span>
            {{ task().category }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md"
            [ngClass]="priorityConfig().classes"
          >
            <span class="text-[8px]">{{ priorityConfig().icon }}</span>
            {{ priorityConfig().label }}
          </span>
        </div>

        @if (task().description) {
          <p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
            {{ task().description }}
          </p>
        }

        <!-- Footer with metadata -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/40">
          <!-- Due date -->
          <div class="flex items-center gap-1.5">
            @if (task().dueDate) {
              <svg
                class="w-3.5 h-3.5"
                [class.text-red-500]="isOverdue()"
                [class.text-slate-400]="!isOverdue()"
                [class.dark:text-slate-500]="!isOverdue()"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span
                class="text-xs font-medium"
                [class.text-red-500]="isOverdue()"
                [class.text-slate-500]="!isOverdue()"
                [class.dark:text-slate-400]="!isOverdue()"
              >
                {{ task().dueDate | date:'MMM d' }}
              </span>
              @if (isOverdue()) {
                <span class="text-[9px] font-semibold uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                  Overdue
                </span>
              }
            } @else {
              <span class="text-xs text-slate-400 dark:text-slate-500 italic">No due date</span>
            }
          </div>

          <!-- Assignee -->
          @if (task().assignee) {
            <div class="flex items-center gap-1.5" [title]="task().assignee!.email || 'Unknown'">
              <div class="w-5 h-5 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span class="text-[9px] font-bold text-white uppercase">
                  {{ assigneeInitial() }}
                </span>
              </div>
              <span class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-20">
                {{ assigneeDisplayName() }}
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Hover edit indicator -->
      <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
        <div class="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <svg class="w-3 h-3 text-amber-600 dark:text-amber-400" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    </div>
  `,
})
export class TaskCardComponent {
  readonly task = input.required<ITask>();
  readonly edit = output<ITask>();

  protected readonly priorityConfig = computed(() => PRIORITY_CONFIG[this.task().priority]);
  protected readonly categoryConfig = computed(() => CATEGORY_CONFIG[this.task().category]);

  protected readonly priorityBarColor = computed(() => {
    const priority = this.task().priority;
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      default: return 'bg-slate-300 dark:bg-slate-600';
    }
  });

  // Safely get assignee initial with fallback
  protected readonly assigneeInitial = computed(() => {
    const email = this.task().assignee?.email;
    if (!email || email.length === 0) return '?';
    return email.charAt(0);
  });

  // Safely get assignee display name with fallback
  protected readonly assigneeDisplayName = computed(() => {
    const email = this.task().assignee?.email;
    if (!email || email.length === 0) return 'Unknown';
    const atIndex = email.indexOf('@');
    return atIndex > 0 ? email.substring(0, atIndex) : email;
  });

  // Fix: Check task status - completed tasks are never overdue
  // Fix: Normalize dates to start of day for fair comparison
  protected readonly isOverdue = computed(() => {
    const task = this.task();

    // Completed tasks are never overdue
    if (task.status === 'done') return false;

    const dueDate = task.dueDate;
    if (!dueDate) return false;

    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return false;

    // Normalize to start of day for comparison
    // Task is overdue only if due date is before today (not on today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  });

  onEdit() {
    this.edit.emit(this.task());
  }
}
