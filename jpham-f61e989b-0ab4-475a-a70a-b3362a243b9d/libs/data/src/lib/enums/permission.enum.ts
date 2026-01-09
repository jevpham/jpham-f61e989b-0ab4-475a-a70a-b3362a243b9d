export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type PermissionResource = 'task' | 'user' | 'audit-log';

export interface Permission {
  action: PermissionAction;
  resource: PermissionResource;
}
