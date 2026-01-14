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
  styleUrl: './task-card.component.scss',
  template: `
    <article class="task-card" (click)="onEdit()" (keydown.enter)="onEdit()" (keydown.space)="onEdit(); $event.preventDefault()" tabindex="0" role="button" [attr.aria-label]="'Edit task: ' + task().title">
      <!-- Left accent strip based on priority -->
      <div class="task-card__accent" [attr.data-priority]="task().priority"></div>

      <div class="task-card__content">
        <!-- Title -->
        <h4 class="task-card__title">{{ task().title }}</h4>

        <!-- Tags row -->
        <div class="task-card__tags">
          <span class="task-card__tag task-card__tag--category" [attr.data-category]="task().category">
            <span class="task-card__tag-icon">{{ categoryConfig().icon }}</span>
            {{ task().category }}
          </span>
          <span class="task-card__tag task-card__tag--priority" [attr.data-priority]="task().priority">
            <span class="task-card__tag-icon">{{ priorityConfig().icon }}</span>
            {{ priorityConfig().label }}
          </span>
        </div>

        <!-- Description (if exists) -->
        @if (task().description) {
          <p class="task-card__description">{{ task().description }}</p>
        }

        <!-- Footer -->
        <div class="task-card__footer">
          <div class="task-card__meta">
            @if (task().dueDate) {
              <span class="task-card__date" [class.task-card__date--overdue]="isOverdue()">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ task().dueDate | date:'MMM d' }}
              </span>
              @if (isOverdue()) {
                <span class="task-card__overdue-badge">Overdue</span>
              }
            } @else {
              <span class="task-card__no-date">No due date</span>
            }
          </div>

          @if (task().assignee) {
            <div class="task-card__assignee" [title]="task().assignee!.email || 'Unknown'">
              <div class="task-card__avatar">{{ assigneeInitial() }}</div>
              <span class="task-card__assignee-name">{{ assigneeDisplayName() }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Hover edit indicator -->
      <div class="task-card__edit-hint">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </div>
    </article>
  `,
})
export class TaskCardComponent {
  readonly task = input.required<ITask>();
  readonly edit = output<ITask>();

  protected readonly priorityConfig = computed(() => PRIORITY_CONFIG[this.task().priority]);
  protected readonly categoryConfig = computed(() => CATEGORY_CONFIG[this.task().category]);

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
