import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskPriority,
  TaskStatus,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="onCancel()"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ task ? 'Edit Task' : 'Create New Task' }}
          </h3>
        </div>

        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="p-6 space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              formControlName="title"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter task description"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                formControlName="priority"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                @for (priority of priorities; track priority) {
                  <option [value]="priority">{{ priority | titlecase }}</option>
                }
              </select>
            </div>

            @if (task) {
              <div>
                <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  formControlName="status"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  @for (status of statuses; track status.value) {
                    <option [value]="status.value">{{ status.label }}</option>
                  }
                </select>
              </div>
            }
          </div>

          <div>
            <label for="dueDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <input
              id="dueDate"
              type="date"
              formControlName="dueDate"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              @if (task) {
                <button
                  type="button"
                  (click)="onDelete()"
                  class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Delete
                </button>
              }
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                (click)="onCancel()"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="taskForm.invalid"
                class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ task ? 'Save Changes' : 'Create Task' }}
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
    status: ['todo' as TaskStatus],
    dueDate: [''],
  });

  ngOnInit() {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        priority: this.task.priority,
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
          status: formValue.status as TaskStatus,
          dueDate: formValue.dueDate || null,
        };
        this.save.emit(dto);
      } else {
        const dto: CreateTaskDto = {
          title: formValue.title!,
          description: formValue.description || undefined,
          priority: formValue.priority as TaskPriority,
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
