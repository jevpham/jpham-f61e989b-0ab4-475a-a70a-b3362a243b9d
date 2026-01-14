import { AuditAction } from '../enums/audit-action.enum';
import { IUser } from './user.interface';

export interface IAuditLog {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  organizationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  // Optional relation populated by backend
  user?: IUser;
}
