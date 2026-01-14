import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../store/auth/auth.store';
import { AuditService, AuditLogFilters } from '../../../core/services/audit.service';
import { IAuditLog } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss'],
})
export class AuditLogComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  private readonly auditService = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('tableContainer') tableContainer?: ElementRef<HTMLElement>;

  // Signal-based state for OnPush compatibility
  protected readonly auditLogs = signal<IAuditLog[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(20);
  protected readonly total = signal(0);
  protected filters: AuditLogFilters = {};

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  ngOnInit() {
    this.loadAuditLogs();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvents(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (!target?.closest('.audit-container')) {
      return;
    }

    // Don't intercept keyboard navigation in interactive elements.
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        if (this.page() > 1) {
          event.preventDefault();
          this.previousPage();
        }
        break;
      case 'ArrowRight':
        if (this.page() * this.limit() < this.total()) {
          event.preventDefault();
          this.nextPage();
        }
        break;
    }
  }

  loadAuditLogs() {
    this.isLoading.set(true);
    this.error.set(null);

    this.auditService
      .getAuditLogs(this.filters, this.page(), this.limit())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.auditLogs.set(response.data);
          this.total.set(response.total);
          this.isLoading.set(false);

          // Move focus to table for accessibility
          setTimeout(() => {
            this.tableContainer?.nativeElement?.focus();
          }, 100);
        },
        error: (err) => {
          this.error.set(this.handleError(err));
          this.isLoading.set(false);
        },
      });
  }

  refresh() {
    this.page.set(1);
    this.loadAuditLogs();
  }

  previousPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadAuditLogs();
    }
  }

  nextPage() {
    if (this.page() * this.limit() < this.total()) {
      this.page.update(p => p + 1);
      this.loadAuditLogs();
    }
  }

  getActionClass(action: string): string {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'action-badge--create';
    if (actionLower.includes('update')) return 'action-badge--update';
    if (actionLower.includes('delete')) return 'action-badge--delete';
    if (actionLower.includes('login')) return 'action-badge--login';
    if (actionLower.includes('logout')) return 'action-badge--logout';
    if (actionLower.includes('register')) return 'action-badge--register';
    if (actionLower.includes('access_denied')) return 'action-badge--denied';
    return 'action-badge--default';
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

  private handleError(err: { status?: number; error?: { message?: string } }): string {
    if (err.status === 403) {
      return 'You do not have permission to view audit logs';
    } else if (err.status === 404) {
      return 'Audit log service is unavailable';
    } else if (err.status === 500) {
      return 'Server error occurred while loading audit logs';
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'No internet connection. Please check your network.';
    }
    return err.error?.message || 'Failed to load audit logs. Please try again.';
  }
}
