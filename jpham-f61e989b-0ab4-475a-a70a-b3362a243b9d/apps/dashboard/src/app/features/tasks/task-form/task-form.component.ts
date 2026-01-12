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
  template: `
    <div
      class="task-form-overlay"
      (click)="onCancel()"
      role="presentation"
    >
      <div
        class="task-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        aria-describedby="task-form-subtitle"
        (click)="$event.stopPropagation()"
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
              placeholder="What needs to be done?"
              aria-required="true"
              [attr.aria-invalid]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
            />
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
              @if (task) {
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
  styles: [`
    /* ===========================================
       TASK FORM COMPONENT STYLES
       Using CSS variables from design system
       =========================================== */

    /* Overlay - uses modal-backdrop pattern */
    .task-form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg, 1rem);
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Modal */
    .task-form-modal {
      background: #ffffff;
      border-radius: var(--radius-xl, 1rem);
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.05),
        0 20px 50px -12px rgba(0, 0, 0, 0.25),
        0 8px 20px -8px rgba(0, 0, 0, 0.15);
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host-context(.dark) .task-form-modal {
      background: var(--color-primary-900, #18181b);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.06),
        0 20px 50px -12px rgba(0, 0, 0, 0.5),
        0 8px 20px -8px rgba(0, 0, 0, 0.4);
    }

    /* Header */
    .task-form-header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-lg, 1rem);
      padding: var(--space-xl, 1.5rem) 1.75rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    :host-context(.dark) .task-form-header {
      border-bottom-color: rgba(255, 255, 255, 0.06);
    }

    .header-icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--color-accent-600, #0d9488) 0%, var(--color-accent-700, #0f766e) 100%);
      border-radius: var(--radius-lg, 0.75rem);
      color: #ffffff;
      flex-shrink: 0;
      box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.4);
    }

    .header-text {
      flex: 1;
      min-width: 0;
    }

    .header-title {
      font-family: var(--font-display, 'Playfair Display', Georgia, serif);
      font-size: 1.375rem;
      font-weight: 600;
      color: var(--color-primary-900, #18181b);
      margin: 0;
      letter-spacing: -0.02em;
    }

    :host-context(.dark) .header-title {
      color: var(--color-primary-50, #fafafa);
    }

    .header-subtitle {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.875rem;
      color: var(--color-primary-500, #71717a);
      margin: 0.25rem 0 0;
    }

    /* Form Body */
    .task-form-body {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: var(--space-xl, 1.25rem);
    }

    /* Form Groups */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm, 0.5rem);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg, 1rem);
    }

    @media (max-width: 480px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    /* Labels */
    .form-label {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-primary-700, #3f3f46);
      letter-spacing: 0.01em;
    }

    :host-context(.dark) .form-label {
      color: var(--color-primary-400, #a1a1aa);
    }

    .required-mark {
      color: #dc2626;
      margin-left: 2px;
    }

    /* Inputs - using input-field pattern */
    .form-input {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.9375rem;
      color: var(--color-primary-900, #18181b);
      background: var(--color-primary-50, #fafafa);
      border: 1.5px solid var(--color-primary-200, #e4e4e7);
      border-radius: var(--radius-md, 0.625rem);
      padding: var(--space-md, 0.75rem) var(--space-lg, 1rem);
      width: 100%;
      transition: all 0.2s ease;
      outline: none;
    }

    :host-context(.dark) .form-input {
      color: var(--color-primary-50, #fafafa);
      background: var(--color-primary-800, #27272a);
      border-color: var(--color-primary-700, #3f3f46);
    }

    .form-input:hover {
      border-color: var(--color-primary-300, #d4d4d8);
    }

    :host-context(.dark) .form-input:hover {
      border-color: var(--color-primary-600, #52525b);
    }

    .form-input:focus {
      border-color: var(--color-accent-600, #0d9488);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
    }

    :host-context(.dark) .form-input:focus {
      background: var(--color-primary-900, #18181b);
      box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
    }

    .form-input::placeholder {
      color: var(--color-primary-400, #a1a1aa);
    }

    :host-context(.dark) .form-input::placeholder {
      color: var(--color-primary-600, #52525b);
    }

    /* Textarea */
    .form-textarea {
      resize: none;
      min-height: 88px;
      line-height: 1.5;
    }

    /* Select */
    .select-wrapper {
      position: relative;
    }

    .form-select {
      appearance: none;
      padding-right: 2.5rem;
      cursor: pointer;
    }

    .select-chevron {
      position: absolute;
      right: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-primary-500, #71717a);
      pointer-events: none;
      transition: transform 0.2s ease;
    }

    .form-select:focus + .select-chevron {
      color: var(--color-accent-600, #0d9488);
    }

    /* Date Input */
    .form-input[type="date"] {
      cursor: pointer;
    }

    .form-input[type="date"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }

    .form-input[type="date"]:hover::-webkit-calendar-picker-indicator {
      opacity: 1;
    }

    /* Actions */
    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-lg, 1rem);
      padding-top: var(--space-xl, 1.25rem);
      margin-top: var(--space-sm, 0.5rem);
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    :host-context(.dark) .form-actions {
      border-top-color: rgba(255, 255, 255, 0.06);
    }

    .actions-left {
      flex-shrink: 0;
    }

    .actions-right {
      display: flex;
      align-items: center;
      gap: var(--space-md, 0.75rem);
    }

    /* Buttons - using btn-secondary pattern */
    .btn-cancel {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-primary-600, #52525b);
      background: transparent;
      border: 1.5px solid var(--color-primary-200, #e4e4e7);
      border-radius: var(--radius-sm, 0.5rem);
      padding: 0.625rem 1.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    :host-context(.dark) .btn-cancel {
      color: var(--color-primary-400, #a1a1aa);
      border-color: var(--color-primary-700, #3f3f46);
    }

    .btn-cancel:hover {
      background: var(--color-primary-100, #f4f4f5);
      border-color: var(--color-primary-300, #d4d4d8);
      color: var(--color-primary-900, #18181b);
    }

    :host-context(.dark) .btn-cancel:hover {
      background: var(--color-primary-800, #27272a);
      border-color: var(--color-primary-600, #52525b);
      color: var(--color-primary-50, #fafafa);
    }

    /* Submit button - using btn-primary pattern */
    .btn-submit {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.875rem;
      font-weight: 600;
      color: #ffffff;
      background: linear-gradient(135deg, var(--color-accent-600, #0d9488) 0%, var(--color-accent-700, #0f766e) 100%);
      border: none;
      border-radius: var(--radius-sm, 0.5rem);
      padding: 0.6875rem 1.5rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm, 0.5rem);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px -2px rgba(13, 148, 136, 0.4);
    }

    .btn-submit:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-accent-500, #14b8a6) 0%, var(--color-accent-600, #0d9488) 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px -4px rgba(13, 148, 136, 0.5);
    }

    .btn-submit:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-submit:disabled {
      background: var(--color-primary-300, #d4d4d8);
      color: var(--color-primary-400, #a1a1aa);
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    :host-context(.dark) .btn-submit:disabled {
      background: var(--color-primary-700, #3f3f46);
      color: var(--color-primary-500, #71717a);
    }

    .btn-submit svg {
      flex-shrink: 0;
    }

    /* Delete button - using btn-danger pattern */
    .btn-delete {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.875rem;
      font-weight: 500;
      color: #dc2626;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 0.5rem);
      padding: 0.625rem var(--space-lg, 1rem);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      transition: all 0.2s ease;
    }

    .btn-delete:hover {
      background: rgba(220, 38, 38, 0.08);
      color: #b91c1c;
    }

    .btn-delete svg {
      flex-shrink: 0;
    }

    /* Scrollbar */
    .task-form-modal::-webkit-scrollbar {
      width: 6px;
    }

    .task-form-modal::-webkit-scrollbar-track {
      background: transparent;
    }

    .task-form-modal::-webkit-scrollbar-thumb {
      background: var(--color-primary-300, #d4d4d8);
      border-radius: 3px;
    }

    :host-context(.dark) .task-form-modal::-webkit-scrollbar-thumb {
      background: var(--color-primary-700, #3f3f46);
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .task-form-overlay,
      .task-form-modal {
        animation: none;
      }

      .btn-submit:hover:not(:disabled) {
        transform: none;
      }
    }

    /* Screen reader only utility */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `],
})
export class TaskFormComponent implements OnInit, AfterViewInit {
  @Input() task: ITask | null = null;
  @Output() save = new EventEmitter<CreateTaskDto | UpdateTaskDto>();
  @Output() delete = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  @ViewChild('modalElement') modalElement!: ElementRef<HTMLDivElement>;

  private readonly fb = inject(FormBuilder);

  /** Handle Escape key to close modal */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
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
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      this.delete.emit();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
