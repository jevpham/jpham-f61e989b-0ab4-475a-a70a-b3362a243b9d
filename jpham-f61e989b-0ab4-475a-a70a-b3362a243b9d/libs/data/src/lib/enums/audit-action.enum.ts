export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'register'
  | 'access_denied';
