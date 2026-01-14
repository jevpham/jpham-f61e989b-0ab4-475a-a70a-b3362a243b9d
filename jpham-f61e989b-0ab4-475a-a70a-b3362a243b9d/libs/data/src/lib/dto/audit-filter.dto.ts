import { AuditAction } from '../enums/audit-action.enum';

// Unified audit log filter interface for both frontend and backend
// Note: Frontend uses string dates (ISO format), backend converts to Date internally
export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  action?: AuditAction | string;
  resource?: string;
  startDate?: string;
  endDate?: string;
}
