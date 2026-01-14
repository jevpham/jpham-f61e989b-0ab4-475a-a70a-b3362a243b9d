import { TaskStatus, TaskPriority, TaskCategory } from '../enums/task-status.enum';

// Plain interfaces for frontend compatibility
// Backend validates via ValidationPipe with class-validator

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueDate?: string;
  assigneeId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  dueDate?: string | null;
  assigneeId?: string | null;
  position?: number;
}

export interface ReorderTaskDto {
  newPosition: number;
}
