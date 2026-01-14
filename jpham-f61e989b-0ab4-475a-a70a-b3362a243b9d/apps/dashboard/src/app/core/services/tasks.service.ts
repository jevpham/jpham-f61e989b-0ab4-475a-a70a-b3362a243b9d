import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ITask,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
} from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export interface TaskFilters {
  status?: TaskStatus;
  assigneeId?: string;
  createdById?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getTasks(organizationId: string, filters?: TaskFilters): Observable<ITask[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.assigneeId) {
      params = params.set('assigneeId', filters.assigneeId);
    }
    if (filters?.createdById) {
      params = params.set('createdById', filters.createdById);
    }

    return this.http.get<PaginatedResponse<ITask>>(
      `${this.apiUrl}/organizations/${organizationId}/tasks`,
      { params },
    ).pipe(
      map(response => response.data)
    );
  }

  getTask(organizationId: string, taskId: string): Observable<ITask> {
    return this.http.get<ITask>(
      `${this.apiUrl}/organizations/${organizationId}/tasks/${taskId}`,
    );
  }

  createTask(organizationId: string, dto: CreateTaskDto): Observable<ITask> {
    return this.http.post<ITask>(
      `${this.apiUrl}/organizations/${organizationId}/tasks`,
      dto,
    );
  }

  updateTask(
    organizationId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Observable<ITask> {
    return this.http.put<ITask>(
      `${this.apiUrl}/organizations/${organizationId}/tasks/${taskId}`,
      dto,
    );
  }

  deleteTask(organizationId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/organizations/${organizationId}/tasks/${taskId}`,
    );
  }
}
