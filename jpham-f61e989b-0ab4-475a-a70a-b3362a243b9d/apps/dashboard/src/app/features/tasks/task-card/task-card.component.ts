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
  styles: [`
    /* ============================================
       TASK CARD - Editorial Card Design
       Matches the app's sophisticated teal/amber
       color scheme with clean typography
       ============================================ */

    .task-card {
      position: relative;
      display: flex;
      background: #ffffff;
      border-radius: 10px;
      cursor: grab;
      overflow: hidden;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      /* Subtle border that matches the app aesthetic */
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.04),
        0 0 0 1px rgba(0, 0, 0, 0.04);
    }

    .task-card:hover {
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(217, 119, 6, 0.15);
    }

    .task-card:focus-visible {
      outline: 2px solid #f59e0b;
      outline-offset: 2px;
    }

    .task-card:active {
      cursor: grabbing;
    }

    /* Dark mode */
    :host-context(.dark) .task-card {
      background: #1e293b;
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    :host-context(.dark) .task-card:hover {
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(217, 119, 6, 0.25);
    }

    /* Left accent strip */
    .task-card__accent {
      width: 4px;
      flex-shrink: 0;
      background: #e2e8f0;
    }

    .task-card__accent[data-priority="urgent"] { background: #ef4444; }
    .task-card__accent[data-priority="high"] { background: #f97316; }
    .task-card__accent[data-priority="medium"] { background: #0d9488; }
    .task-card__accent[data-priority="low"] { background: #94a3b8; }

    :host-context(.dark) .task-card__accent { background: #475569; }
    :host-context(.dark) .task-card__accent[data-priority="urgent"] { background: #dc2626; }
    :host-context(.dark) .task-card__accent[data-priority="high"] { background: #ea580c; }
    :host-context(.dark) .task-card__accent[data-priority="medium"] { background: #14b8a6; }
    :host-context(.dark) .task-card__accent[data-priority="low"] { background: #64748b; }

    /* Content area */
    .task-card__content {
      flex: 1;
      padding: 12px 14px;
      min-width: 0;
    }

    /* Title */
    .task-card__title {
      font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      color: #1e293b;
      line-height: 1.4;
      margin: 0 0 8px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    :host-context(.dark) .task-card__title {
      color: #f1f5f9;
    }

    /* Tags row */
    .task-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .task-card__tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-radius: 4px;
    }

    .task-card__tag-icon {
      font-size: 0.75rem;
      line-height: 1;
    }

    /* Category tag colors */
    .task-card__tag--category[data-category="work"] {
      background: #ede9fe;
      color: #7c3aed;
    }
    .task-card__tag--category[data-category="personal"] {
      background: #d1fae5;
      color: #059669;
    }
    .task-card__tag--category[data-category="shopping"] {
      background: #fef3c7;
      color: #d97706;
    }
    .task-card__tag--category[data-category="health"] {
      background: #fce7f3;
      color: #db2777;
    }
    .task-card__tag--category[data-category="other"] {
      background: #f1f5f9;
      color: #475569;
    }

    :host-context(.dark) .task-card__tag--category[data-category="work"] {
      background: rgba(124, 58, 237, 0.2);
      color: #a78bfa;
    }
    :host-context(.dark) .task-card__tag--category[data-category="personal"] {
      background: rgba(5, 150, 105, 0.2);
      color: #6ee7b7;
    }
    :host-context(.dark) .task-card__tag--category[data-category="shopping"] {
      background: rgba(217, 119, 6, 0.2);
      color: #fcd34d;
    }
    :host-context(.dark) .task-card__tag--category[data-category="health"] {
      background: rgba(219, 39, 119, 0.2);
      color: #f9a8d4;
    }
    :host-context(.dark) .task-card__tag--category[data-category="other"] {
      background: rgba(71, 85, 105, 0.3);
      color: #cbd5e1;
    }

    /* Priority tag colors */
    .task-card__tag--priority[data-priority="urgent"] {
      background: #fef2f2;
      color: #dc2626;
    }
    .task-card__tag--priority[data-priority="high"] {
      background: #fff7ed;
      color: #ea580c;
    }
    .task-card__tag--priority[data-priority="medium"] {
      background: #f0fdfa;
      color: #0d9488;
    }
    .task-card__tag--priority[data-priority="low"] {
      background: #f8fafc;
      color: #64748b;
    }

    :host-context(.dark) .task-card__tag--priority[data-priority="urgent"] {
      background: rgba(220, 38, 38, 0.15);
      color: #fca5a5;
    }
    :host-context(.dark) .task-card__tag--priority[data-priority="high"] {
      background: rgba(234, 88, 12, 0.15);
      color: #fdba74;
    }
    :host-context(.dark) .task-card__tag--priority[data-priority="medium"] {
      background: rgba(13, 148, 136, 0.15);
      color: #5eead4;
    }
    :host-context(.dark) .task-card__tag--priority[data-priority="low"] {
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
    }

    /* Description */
    .task-card__description {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 10px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    :host-context(.dark) .task-card__description {
      color: #94a3b8;
    }

    /* Footer */
    .task-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }

    :host-context(.dark) .task-card__footer {
      border-top-color: #334155;
    }

    .task-card__meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .task-card__date {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
      color: #64748b;
    }

    .task-card__date svg {
      color: #94a3b8;
    }

    :host-context(.dark) .task-card__date {
      color: #94a3b8;
    }

    :host-context(.dark) .task-card__date svg {
      color: #64748b;
    }

    .task-card__date--overdue {
      color: #dc2626;
    }

    .task-card__date--overdue svg {
      color: #dc2626;
    }

    .task-card__overdue-badge {
      font-size: 0.5625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #dc2626;
      background: #fef2f2;
      padding: 2px 6px;
      border-radius: 3px;
    }

    :host-context(.dark) .task-card__overdue-badge {
      background: rgba(220, 38, 38, 0.15);
      color: #fca5a5;
    }

    .task-card__no-date {
      font-size: 0.6875rem;
      color: #94a3b8;
      font-style: italic;
    }

    :host-context(.dark) .task-card__no-date {
      color: #64748b;
    }

    /* Assignee */
    .task-card__assignee {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .task-card__avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.5625rem;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
    }

    .task-card__assignee-name {
      font-size: 0.6875rem;
      color: #64748b;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host-context(.dark) .task-card__assignee-name {
      color: #94a3b8;
    }

    /* Edit hint */
    .task-card__edit-hint {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #fef3c7;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.15s ease;
    }

    .task-card__edit-hint svg {
      color: #d97706;
    }

    :host-context(.dark) .task-card__edit-hint {
      background: rgba(217, 119, 6, 0.2);
    }

    :host-context(.dark) .task-card__edit-hint svg {
      color: #fbbf24;
    }

    .task-card:hover .task-card__edit-hint,
    .task-card:focus-visible .task-card__edit-hint {
      opacity: 1;
      transform: scale(1);
    }

    /* Drag state - card being dragged */
    :host(.cdk-drag-dragging) .task-card {
      opacity: 0.9;
    }
  `],
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
