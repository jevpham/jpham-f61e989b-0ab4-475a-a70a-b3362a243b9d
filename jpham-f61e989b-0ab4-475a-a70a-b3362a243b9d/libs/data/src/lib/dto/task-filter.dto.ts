import { TaskStatus, TaskCategory } from '../enums/task-status.enum';

// Unified task filter interface for both frontend and backend
export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  assigneeId?: string;
  createdById?: string;
}

// Alias for backwards compatibility
export type TaskFilterParams = TaskFilters;
