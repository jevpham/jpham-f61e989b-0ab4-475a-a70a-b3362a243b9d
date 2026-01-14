import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AuditAction, IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';
import { Request } from 'express';

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
  GET: 'read',
};

// Routes that should be audited by the interceptor.
// NOTE: Auth routes (login, logout, register) are included here for automatic logging.
const AUDITED_RESOURCES = ['tasks', 'organizations', 'auth'];

// Error messages that are safe to log (don't expose internal details)
const SAFE_ERROR_CATEGORIES: Record<number, string> = {
  400: 'validation_error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable_entity',
  429: 'rate_limited',
  500: 'internal_error',
  502: 'bad_gateway',
  503: 'service_unavailable',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const path = request.path;
    const user = request.user as IUser | undefined;

    // Determine if this request should be audited
    const resource = this.extractResource(path);
    if (!resource || !AUDITED_RESOURCES.includes(resource)) {
      return next.handle();
    }

    // Don't audit GET requests (too noisy)
    if (method === 'GET') {
      return next.handle();
    }

    const action = this.determineAction(method, path);
    const resourceId = this.extractResourceId(path);
    const organizationId = this.extractOrganizationId(path);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Log successful operation
          this.auditService
            .log({
              action,
              resource,
              resourceId:
                resourceId || this.extractIdFromResponse(response) || null,
              userId: user?.id ?? null,
              organizationId: organizationId ?? user?.organizationId ?? null,
              ipAddress: this.getClientIp(request),
              userAgent: request.get('user-agent') ?? null,
              metadata: {
                method,
                path,
                statusCode: 200,
                authenticated: !!user,
                authMethod: user ? 'jwt' : 'none',
              },
            })
            .catch((err) => {
              this.logger.error(`Failed to log audit entry: ${err.message}`);
            });
        },
        error: (error) => {
          const errorAction = this.mapErrorToAction(error, action);
          const statusCode = error.status || 500;

          // Log failed operation with sanitized error details
          this.auditService
            .log({
              action: errorAction,
              resource,
              resourceId,
              userId: user?.id ?? null,
              organizationId: organizationId ?? user?.organizationId ?? null,
              ipAddress: this.getClientIp(request),
              userAgent: request.get('user-agent') ?? null,
              metadata: {
                method,
                path,
                statusCode,
                authenticated: !!user,
                authMethod: user ? 'jwt' : 'none',
                // Sanitized error - only log safe category, not internal details
                errorCategory: SAFE_ERROR_CATEGORIES[statusCode] || 'unknown_error',
                errorType: error.constructor?.name || 'Error',
              },
            })
            .catch((err) => {
              this.logger.error(`Failed to log audit entry: ${err.message}`);
            });
        },
      }),
    );
  }

  private determineAction(method: string, path: string): AuditAction {
    // Extract path segments for more precise matching
    const segments = path.split('/').filter(Boolean);

    // Handle auth-specific actions (exact path matching)
    if (segments[0] === 'auth') {
      if (segments[1] === 'login') return 'login';
      if (segments[1] === 'logout') return 'logout';
      if (segments[1] === 'register') return 'register';
    }

    // Handle task-specific actions
    if (method === 'PUT' && path.includes('/reorder')) {
      return 'reorder';
    }
    if ((method === 'PUT' || method === 'PATCH') && path.includes('/status')) {
      return 'status_change';
    }

    // Default to method-based action mapping
    return METHOD_ACTION_MAP[method] || 'read';
  }

  private mapErrorToAction(
    error: { status?: number },
    fallbackAction: AuditAction,
  ): AuditAction {
    const status = error.status || 500;
    if (status === 401 || status === 403) {
      return 'access_denied';
    }
    return fallbackAction;
  }

  private extractResource(path: string): string | null {
    // Extract resource from path like /organizations/:id/tasks or /tasks
    const parts = path.split('/').filter(Boolean);

    // Handle nested routes like /organizations/:id/tasks
    if (parts.includes('tasks')) {
      return 'tasks';
    }
    if (parts.includes('organizations')) {
      return 'organizations';
    }
    if (parts.includes('auth')) {
      return 'auth';
    }

    return parts[0] || null;
  }

  private extractResourceId(path: string): string | null {
    // Extract UUID from path
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const parts = path.split('/').filter(Boolean);

    // For nested routes, get the last UUID (the resource ID, not org ID)
    const uuids = parts.filter((p) => uuidRegex.test(p));
    return uuids.length > 0 ? uuids[uuids.length - 1] : null;
  }

  private extractOrganizationId(path: string): string | null {
    // Extract organization ID from paths like /organizations/:orgId/...
    const parts = path.split('/').filter(Boolean);
    const orgIndex = parts.indexOf('organizations');

    if (orgIndex !== -1 && parts[orgIndex + 1]) {
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      if (uuidRegex.test(parts[orgIndex + 1])) {
        return parts[orgIndex + 1];
      }
    }

    return null;
  }

  private extractIdFromResponse(response: unknown): string | null {
    if (!response || typeof response !== 'object') return null;

    const resp = response as Record<string, unknown>;

    // Handle direct { id } response
    if ('id' in resp && typeof resp.id === 'string') {
      return resp.id;
    }

    // Handle nested { data: { id } } response
    if ('data' in resp && resp.data && typeof resp.data === 'object') {
      const data = resp.data as Record<string, unknown>;
      if ('id' in data && typeof data.id === 'string') {
        return data.id;
      }
    }

    return null;
  }

  private getClientIp(request: Request): string | null {
    const forwarded = request.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || null;
  }
}
