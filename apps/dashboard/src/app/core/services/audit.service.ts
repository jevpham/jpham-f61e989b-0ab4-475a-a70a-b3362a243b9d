import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  IAuditLog,
  AuditLogFilters,
  PaginatedResponse,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// Re-export for backward compatibility with existing imports
export type { AuditLogFilters } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export type PaginatedAuditLogs = PaginatedResponse<IAuditLog>;

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getAuditLogs(
    filters?: AuditLogFilters,
    page = 1,
    limit = 20,
  ): Observable<PaginatedAuditLogs> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters?.action) {
      params = params.set('action', filters.action);
    }
    if (filters?.resource) {
      params = params.set('resource', filters.resource);
    }
    if (filters?.userId) {
      params = params.set('userId', filters.userId);
    }
    if (filters?.organizationId) {
      params = params.set('organizationId', filters.organizationId);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<PaginatedAuditLogs>(`${this.apiUrl}/audit-logs`, {
      params,
    });
  }
}
