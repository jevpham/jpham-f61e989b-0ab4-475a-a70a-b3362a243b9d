import { Component, Input, Output, EventEmitter, OnInit, inject, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskPriority,
  TaskStatus,
  TaskCategory,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./task-form.component.scss'],
  template: `
    <div
      class="task-form-overlay"
      (click)="onCancel()"
      (keydown.escape)="onCancel()"
      role="presentation"
    >
      <div
        class="task-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        aria-describedby="task-form-subtitle"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        #modalElement
      >
        <!-- Header -->
        <div class="task-form-header">
          <div class="header-icon" aria-hidden="true">
            @if (task) {
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            } @else {
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          </div>
          <div class="header-text">
            <h3 id="task-form-title" class="header-title">
              {{ task ? 'Edit Task' : 'Create New Task' }}
            </h3>
            <p id="task-form-subtitle" class="header-subtitle">
              {{ task ? 'Update task details below' : 'Fill in the details for your new task' }}
            </p>
          </div>
        </div>

        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="task-form-body">
          <!-- Title -->
          <div class="form-group">
            <label for="title" class="form-label">
              Title <span class="required-mark" aria-hidden="true">*</span>
              <span class="sr-only">(required)</span>
            </label>
            <input
              #titleInput
              id="title"
              type="text"
              formControlName="title"
              class="form-input"
              [class.form-input--error]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
              placeholder="What needs to be done?"
              aria-required="true"
              [attr.aria-invalid]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
              [attr.aria-describedby]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched ? 'title-error' : null"
            />
            @if (taskForm.get('title')?.invalid && taskForm.get('title')?.touched) {
              <span id="title-error" class="form-error" role="alert">
                Title is required
              </span>
            }
          </div>

          <!-- Description -->
          <div class="form-group">
            <label for="description" class="form-label">
              Description
            </label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              class="form-input form-textarea"
              placeholder="Add more details about this task..."
            ></textarea>
          </div>

          <!-- Priority & Category -->
          <div class="form-row">
            <div class="form-group">
              <label for="priority" class="form-label">
                Priority
              </label>
              <div class="select-wrapper">
                <select
                  id="priority"
                  formControlName="priority"
                  class="form-input form-select"
                >
                  @for (priority of priorities; track priority) {
                    <option [value]="priority">{{ priority | titlecase }}</option>
                  }
                </select>
                <svg class="select-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div class="form-group">
              <label for="category" class="form-label">
                Category
              </label>
              <div class="select-wrapper">
                <select
                  id="category"
                  formControlName="category"
                  class="form-input form-select"
                >
                  @for (category of categories; track category.value) {
                    <option [value]="category.value">{{ category.label }}</option>
                  }
                </select>
                <svg class="select-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Status (only for edit) -->
          @if (task) {
            <div class="form-group">
              <label for="status" class="form-label">
                Status
              </label>
              <div class="select-wrapper">
                <select
                  id="status"
                  formControlName="status"
                  class="form-input form-select"
                >
                  @for (status of statuses; track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
                <svg class="select-chevron" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          }

          <!-- Due Date -->
          <div class="form-group">
            <label for="dueDate" class="form-label">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              formControlName="dueDate"
              class="form-input"
            />
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <div class="actions-left">
              @if (task && canDelete) {
                <button
                  type="button"
                  (click)="onDelete()"
                  class="btn-delete"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              }
            </div>
            <div class="actions-right">
              <button
                type="button"
                (click)="onCancel()"
                class="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="taskForm.invalid"
                [attr.aria-disabled]="taskForm.invalid"
                class="btn-submit"
              >
                @if (task) {
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                } @else {
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Task
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class TaskFormComponent implements OnInit, AfterViewInit {
  @Input() task: ITask | null = null;
  @Input() canDelete = true; // RBAC: Controls delete button visibility
  @Output() save = new EventEmitter<CreateTaskDto | UpdateTaskDto>();
  @Output() deleteTask = new EventEmitter<void>();
  @Output() cancelForm = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  @ViewChild('modalElement') modalElement!: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);

  /** Handle Escape key to close modal */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  /** Trap focus within modal for accessibility */
  @HostListener('document:keydown', ['$event'])
  onTabKey(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    if (!this.modalElement?.nativeElement) return;

    const focusableElements = this.modalElement.nativeElement.querySelectorAll<HTMLElement>(
      'input, select, textarea, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }

  protected priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  protected categories: { value: TaskCategory; label: string }[] = [
    { value: 'work', label: 'Work' },
    { value: 'personal', label: 'Personal' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'health', label: 'Health' },
    { value: 'other', label: 'Other' },
  ];
  protected statuses: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
  ];

  protected taskForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    priority: ['medium' as TaskPriority],
    category: ['other' as TaskCategory],
    status: ['todo' as TaskStatus],
    dueDate: [''],
  });

  ngOnInit() {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        priority: this.task.priority,
        category: this.task.category,
        status: this.task.status,
        dueDate: this.task.dueDate
          ? new Date(this.task.dueDate).toISOString().split('T')[0]
          : '',
      });
    }
  }

  ngAfterViewInit() {
    // Focus the title input when modal opens for accessibility
    setTimeout(() => {
      this.titleInput?.nativeElement?.focus();
    }, 100);
  }

  onSubmit() {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;

      if (this.task) {
        const dto: UpdateTaskDto = {
          title: formValue.title ?? undefined,
          description: formValue.description || null,
          priority: formValue.priority as TaskPriority,
          category: formValue.category as TaskCategory,
          status: formValue.status as TaskStatus,
          dueDate: formValue.dueDate || null,
        };
        this.save.emit(dto);
      } else {
        const dto: CreateTaskDto = {
          title: formValue.title!,
          description: formValue.description || undefined,
          priority: formValue.priority as TaskPriority,
          category: formValue.category as TaskCategory,
          dueDate: formValue.dueDate || undefined,
        };
        this.save.emit(dto);
      }
    }
  }

  onDelete() {
    // Defense in depth: verify permission before emitting
    if (!this.canDelete) {
      console.warn('Delete action blocked: insufficient permissions');
      return;
    }

    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      this.deleteTask.emit();
    }
  }

  onCancel() {
    this.cancelForm.emit();
  }
}
