import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
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
  template: `
    <div
      class="fixed inset-0 modal-backdrop flex items-center justify-center z-50 animate-fade-in"
      (click)="onCancel()"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl shadow-elevated max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-200/60 dark:border-slate-700/40 animate-scale-in"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-700/40">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              @if (task) {
                <svg class="w-5 h-5 text-white" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              } @else {
                <svg class="w-5 h-5 text-white" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              }
            </div>
            <div>
              <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {{ task ? 'Edit Task' : 'Create New Task' }}
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                {{ task ? 'Update task details below' : 'Fill in the details for your new task' }}
              </p>
            </div>
          </div>
        </div>

        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="p-6 space-y-5">
          <!-- Title -->
          <div>
            <label for="title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Title <span class="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              formControlName="title"
              class="input-field"
              placeholder="What needs to be done?"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="description" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              class="input-field resize-none"
              placeholder="Add more details about this task..."
            ></textarea>
          </div>

          <!-- Priority & Category -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="priority" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Priority
              </label>
              <div class="relative">
                <select
                  id="priority"
                  formControlName="priority"
                  class="input-field appearance-none pr-10"
                >
                  @for (priority of priorities; track priority) {
                    <option [value]="priority">{{ priority | titlecase }}</option>
                  }
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div>
              <label for="category" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Category
              </label>
              <div class="relative">
                <select
                  id="category"
                  formControlName="category"
                  class="input-field appearance-none pr-10"
                >
                  @for (category of categories; track category.value) {
                    <option [value]="category.value">{{ category.label }}</option>
                  }
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Status (only for edit) -->
          @if (task) {
            <div>
              <label for="status" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <div class="relative">
                <select
                  id="status"
                  formControlName="status"
                  class="input-field appearance-none pr-10"
                >
                  @for (status of statuses; track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
                <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          }

          <!-- Due Date -->
          <div>
            <label for="dueDate" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              formControlName="dueDate"
              class="input-field"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-700/40">
            <div>
              @if (task) {
                <button
                  type="button"
                  (click)="onDelete()"
                  class="btn-danger"
                >
                  <svg class="w-4 h-4 mr-1.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              }
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="onCancel()"
                class="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="taskForm.invalid"
                class="btn-primary"
              >
                @if (task) {
                  <svg class="w-4 h-4 mr-1.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                } @else {
                  <svg class="w-4 h-4 mr-1.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
export class TaskFormComponent implements OnInit {
  @Input() task: ITask | null = null;
  @Output() save = new EventEmitter<CreateTaskDto | UpdateTaskDto>();
  @Output() delete = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

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
