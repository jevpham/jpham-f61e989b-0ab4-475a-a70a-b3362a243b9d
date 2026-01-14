import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { AuthStore } from '../../store/auth/auth.store';
import { TasksStore } from '../../store/tasks/tasks.store';
import { KeyboardShortcutsDialogComponent } from '../../shared/components/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatRippleModule,
    KeyboardShortcutsDialogComponent,
  ],
  template: `
    <div class="dashboard-container">
      <!-- Decorative Elements -->
      <div class="decorative-grid"></div>
      <div class="decorative-accent"></div>

      <!-- Editorial Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-left">
            <div class="logo-mark">
              <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" stroke-width="2.5"/>
                <path d="M10 16L14 20L22 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="logo-text">
              <span class="brand-name">TaskFlow</span>
              <span class="brand-edition">Editorial</span>
            </div>
          </div>

          <nav class="header-nav">
            <a routerLink="/tasks" class="nav-link">Board</a>
            @if (authStore.userRole() === 'admin' || authStore.userRole() === 'owner') {
              <a routerLink="/audit" class="nav-link">Audit</a>
            }
          </nav>

          <div class="header-right">
            <div class="role-indicator" [attr.data-role]="authStore.userRole()">
              <span class="role-dot"></span>
              <span class="role-text">{{ authStore.userRole() }}</span>
            </div>

            <button
              class="theme-btn"
              (click)="themeService.toggleDarkMode()"
              [matTooltip]="themeService.isDark() ? 'Light mode' : 'Dark mode'"
              [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
              @if (themeService.isDark()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              }
            </button>

            <button [matMenuTriggerFor]="userMenu" class="avatar-btn" aria-label="User menu">
              <span aria-hidden="true">{{ authStore.user()?.email?.charAt(0)?.toUpperCase() }}</span>
            </button>
            <mat-menu #userMenu="matMenu" class="user-dropdown">
              <div class="dropdown-header">
                <span class="dropdown-email">{{ authStore.user()?.email }}</span>
                <span class="dropdown-org">{{ authStore.organizationId() ? authStore.organizationId()?.slice(0, 8) + '...' : '' }}</span>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="showShortcutsDialog.set(true)">
                <span class="menu-icon">⌨</span>
                <span>Shortcuts</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()" class="logout-btn">
                <span class="menu-icon">→</span>
                <span>Sign out</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="dashboard-main">
        <!-- Hero Section with Asymmetric Layout -->
        <section class="hero-section">
          <div class="hero-content">
            <div class="hero-text">
              <span class="hero-eyebrow">Dashboard</span>
              <h1 class="hero-title">
                Welcome back<span class="title-accent">.</span>
              </h1>
              <p class="hero-subtitle">Your workspace at a glance</p>
            </div>
            <div class="hero-action">
              <a routerLink="/tasks" class="create-task-btn">
                <span class="btn-icon">+</span>
                <span class="btn-text">New Task</span>
              </a>
            </div>
          </div>
        </section>

        <!-- Stats Section - Magazine Layout -->
        <section class="stats-section">
          <div class="stats-header">
            <h2 class="section-title">Overview</h2>
            <div class="section-line"></div>
          </div>

          <div class="stats-grid">
            <!-- Large Feature Stat -->
            <div class="stat-card stat-featured">
              <div class="stat-number">{{ tasksStore.completionRate() }}<span class="stat-unit">%</span></div>
              <div class="stat-label">Completion Rate</div>
              <div class="stat-progress">
                <div class="progress-track">
                  <div class="progress-fill" [style.width.%]="tasksStore.completionRate()"></div>
                </div>
              </div>
            </div>

            <!-- Regular Stats -->
            <div class="stat-card" role="group" aria-label="Total tasks statistic">
              <div class="stat-icon stat-icon-total" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <div class="stat-number">{{ tasksStore.taskCount() }}</div>
              <div class="stat-label">Total Tasks</div>
            </div>

            <div class="stat-card" role="group" aria-label="Completed tasks statistic">
              <div class="stat-icon stat-icon-done" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <div class="stat-number">{{ tasksStore.doneTasks().length }}</div>
              <div class="stat-label">Completed</div>
            </div>

            <div class="stat-card" role="group" aria-label="In progress tasks statistic">
              <div class="stat-icon stat-icon-progress" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
              </div>
              <div class="stat-number">{{ tasksStore.inProgressTasks().length }}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>
        </section>

        <!-- Quick Actions + Status Grid -->
        <section class="content-section">
          <div class="content-grid">
            <!-- Quick Actions Card -->
            <div class="action-card">
              <div class="card-header">
                <h3 class="card-title">Quick Actions</h3>
                <span class="card-badge">Navigate</span>
              </div>
              <div class="action-list">
                <a routerLink="/tasks" class="action-item" matRipple aria-label="Go to Task Board - Kanban view">
                  <div class="action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7"/>
                      <rect x="14" y="3" width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <div class="action-text">
                    <span class="action-title">Task Board</span>
                    <span class="action-desc">Kanban view</span>
                  </div>
                  <span class="action-arrow" aria-hidden="true">→</span>
                </a>

                @if (authStore.userRole() === 'admin' || authStore.userRole() === 'owner') {
                  <a routerLink="/audit" class="action-item" matRipple aria-label="Go to Audit Logs - Activity history">
                    <div class="action-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                      </svg>
                    </div>
                    <div class="action-text">
                      <span class="action-title">Audit Logs</span>
                      <span class="action-desc">Activity history</span>
                    </div>
                    <span class="action-arrow" aria-hidden="true">→</span>
                  </a>
                }
              </div>
            </div>

            <!-- Status Breakdown -->
            <div class="status-card">
              <div class="card-header">
                <h3 class="card-title">Status Breakdown</h3>
                <span class="card-badge">Live</span>
              </div>
              @if (tasksStore.taskCount() === 0) {
                <div class="empty-state" role="status">
                  <div class="empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                    </svg>
                  </div>
                  <span class="empty-title">No tasks yet</span>
                  <span class="empty-desc">Create your first task to begin</span>
                </div>
              } @else {
                <div class="status-list" role="list" aria-label="Task status breakdown">
                  @for (stat of statusStats; track stat.status) {
                    <div class="status-item" role="listitem" [attr.aria-label]="stat.label + ': ' + stat.count() + ' tasks'">
                      <div class="status-indicator" [style.background]="stat.color" aria-hidden="true"></div>
                      <span class="status-name">{{ stat.label }}</span>
                      <span class="status-count">{{ stat.count() }}</span>
                      <div class="status-bar" role="progressbar" [attr.aria-valuenow]="getStatusPercent(stat.count())" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="stat.label + ' progress'">
                        <div class="status-fill" [style.width.%]="getStatusPercent(stat.count())" [style.background]="stat.color"></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="dashboard-footer">
          <div class="keyboard-hint" role="note" aria-label="Keyboard shortcut hint: Press Shift and question mark for shortcuts">
            <span class="hint-icon" aria-hidden="true">⌨</span>
            <span>Press</span>
            <kbd>Shift</kbd>
            <span>+</span>
            <kbd>?</kbd>
            <span>for shortcuts</span>
          </div>
        </footer>
      </main>
    </div>

    @if (showShortcutsDialog()) {
      <app-keyboard-shortcuts-dialog (closeDialog)="showShortcutsDialog.set(false)" />
    }
  `,
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  protected readonly authStore = inject(AuthStore);
  protected readonly tasksStore = inject(TasksStore);
  protected readonly themeService = inject(ThemeService);
  private readonly keyboardService = inject(KeyboardShortcutsService);
  private readonly destroyRef = inject(DestroyRef);

  protected showShortcutsDialog = signal(false);

  protected readonly statusStats = [
    { status: 'todo', label: 'To Do', count: () => this.tasksStore.todoTasks().length, color: '#a1a1aa' },
    { status: 'in_progress', label: 'In Progress', count: () => this.tasksStore.inProgressTasks().length, color: '#2563eb' },
    { status: 'review', label: 'Review', count: () => this.tasksStore.reviewTasks().length, color: '#f97316' },
    { status: 'done', label: 'Done', count: () => this.tasksStore.doneTasks().length, color: '#059669' },
  ];

  protected getStatusPercent(count: number): number {
    const total = this.tasksStore.taskCount();
    if (total === 0) return 0;
    return (count / total) * 100;
  }

  ngOnInit(): void {
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }

    this.keyboardService.shortcutTriggered$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((action) => {
        if (action === 'help') {
          this.showShortcutsDialog.set(true);
        }
      });
  }

  logout(): void {
    this.authStore.logout();
  }
}
