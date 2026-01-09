import { TaskStatus, TaskPriority, TaskCategory } from '../enums/task-status.enum';
import { IUser } from './user.interface';

export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: Date | null;
  position: number;
  organizationId: string;
  createdById: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Optional relations populated by backend
  createdBy?: IUser;
  assignee?: IUser;
}
