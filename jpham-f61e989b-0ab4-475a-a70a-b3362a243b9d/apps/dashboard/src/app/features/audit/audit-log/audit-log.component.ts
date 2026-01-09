import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../store/auth/auth.store';
import { AuditService, AuditLogFilters } from '../../../core/services/audit.service';
import { IAuditLog } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 shadow">
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div class="flex items-center gap-4">
            <a routerLink="/dashboard" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ total }} entries
            </span>
          </div>
          <button
            (click)="refresh()"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </header>

      @if (error) {
        <div class="max-w-7xl mx-auto mt-4 px-4">
          <div class="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
            <p class="text-sm text-red-700 dark:text-red-200">{{ error }}</p>
          </div>
        </div>
      }

      <!-- Audit log table -->
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          @if (isLoading) {
            <div class="flex justify-center items-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Resource
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  @for (log of auditLogs; track log.id) {
                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          [ngClass]="getActionClass(log.action)"
                        >
                          {{ log.action }}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {{ log.resource }}
                        @if (log.resourceId) {
                          <span class="text-gray-400 text-xs ml-1">#{{ log.resourceId.slice(0, 8) }}</span>
                        }
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ log.user?.email || 'Unknown' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ log.ipAddress || '-' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDate(log.createdAt) }}
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        No audit logs found
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            @if (total > limit) {
              <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  Showing {{ (page - 1) * limit + 1 }} to {{ Math.min(page * limit, total) }} of {{ total }} results
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="previousPage()"
                    [disabled]="page === 1"
                    class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    (click)="nextPage()"
                    [disabled]="page * limit >= total"
                    class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
})
export class AuditLogComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly auditService = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);

  protected auditLogs: IAuditLog[] = [];
  protected isLoading = false;
  protected error: string | null = null;
  protected page = 1;
  protected limit = 20;
  protected total = 0;
  protected filters: AuditLogFilters = {};

  protected readonly Math = Math;

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.isLoading = true;
    this.error = null;

    this.auditService
      .getAuditLogs(this.filters, this.page, this.limit)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.auditLogs = response.data;
          this.total = response.total;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to load audit logs';
          this.isLoading = false;
        },
      });
  }

  refresh() {
    this.page = 1;
    this.loadAuditLogs();
  }

  previousPage() {
    if (this.page > 1) {
      this.page--;
      this.loadAuditLogs();
    }
  }

  nextPage() {
    if (this.page * this.limit < this.total) {
      this.page++;
      this.loadAuditLogs();
    }
  }

  getActionClass(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) {
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
    if (actionLower.includes('update')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    }
    if (actionLower.includes('delete')) {
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    }
    if (actionLower.includes('login') || actionLower.includes('logout')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
