import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
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

// Routes that should be audited
const AUDITED_RESOURCES = ['tasks', 'organizations'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
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

    const action = METHOD_ACTION_MAP[method] || 'read';
    const resourceId = this.extractResourceId(path);
    const organizationId = this.extractOrganizationId(path);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Log successful operation
          this.auditService.log({
            action,
            resource,
            resourceId: resourceId || (response as { id?: string })?.id || null,
            userId: user?.id ?? null,
            organizationId: organizationId ?? user?.organizationId ?? null,
            ipAddress: this.getClientIp(request),
            userAgent: request.get('user-agent') ?? null,
            metadata: {
              method,
              path,
              statusCode: 200,
            },
          });
        },
        error: (error) => {
          // Log failed operation
          this.auditService.log({
            action: 'access_denied',
            resource,
            resourceId,
            userId: user?.id ?? null,
            organizationId: organizationId ?? user?.organizationId ?? null,
            ipAddress: this.getClientIp(request),
            userAgent: request.get('user-agent') ?? null,
            metadata: {
              method,
              path,
              error: error.message,
              statusCode: error.status || 500,
            },
          });
        },
      }),
    );
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

  private getClientIp(request: Request): string | null {
    const forwarded = request.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || null;
  }
}
