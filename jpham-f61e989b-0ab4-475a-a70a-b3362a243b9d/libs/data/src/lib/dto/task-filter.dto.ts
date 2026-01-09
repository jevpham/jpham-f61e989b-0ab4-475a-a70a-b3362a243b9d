import { TaskStatus, TaskCategory } from '../enums/task-status.enum';

// Plain interface for frontend compatibility
// Backend validates these params directly in the controller/service
export interface TaskFilterParams {
  status?: TaskStatus;
  category?: TaskCategory;
  assigneeId?: string;
  createdById?: string;
}
