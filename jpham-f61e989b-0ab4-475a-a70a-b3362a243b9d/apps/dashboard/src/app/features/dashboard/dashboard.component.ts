import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthStore } from '../../store/auth/auth.store';
import { TasksStore } from '../../store/tasks/tasks.store';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TaskStatsComponent } from '../../shared/components/task-stats/task-stats.component';
import { KeyboardShortcutsDialogComponent } from '../../shared/components/keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HeaderComponent,
    TaskStatsComponent,
    KeyboardShortcutsDialogComponent,
  ],
  template: `
    <div class="min-h-screen gradient-mesh-light dark:gradient-mesh-dark grain-overlay">
      <!-- Header -->
      <app-header title="Task Manager">
        <span slot="subtitle" class="ml-3 badge bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          {{ authStore.userRole() }}
        </span>
        <button
          slot="actions"
          (click)="logout()"
          class="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800/40"
        >
          <svg class="w-4 h-4 mr-2" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </app-header>

      <!-- Main content -->
      <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left column - Navigation cards -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Welcome section -->
            <div class="animate-fade-in-up">
              <h2 class="font-display text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2">
                Welcome back
              </h2>
              <p class="text-slate-500 dark:text-slate-400">
                Here's what's happening with your tasks today.
              </p>
            </div>

            <!-- Navigation cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Tasks card -->
              <a
                routerLink="/tasks"
                class="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/80 shadow-soft hover:shadow-elevated border border-slate-200/60 dark:border-slate-700/40 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up stagger-1"
              >
                <!-- Decorative gradient -->
                <div class="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-amber-400/20 to-transparent rounded-bl-full"></div>

                <div class="relative p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <svg class="w-6 h-6 text-white" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg class="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform group-hover:translate-x-0.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white mb-1">
                    Task Board
                  </h3>
                  <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Manage your tasks with drag-and-drop Kanban board
                  </p>

                  <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <span class="flex items-center gap-1">
                      <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                      {{ tasksStore.taskCount() }} tasks
                    </span>
                    <span class="text-slate-300 dark:text-slate-600">•</span>
                    <span>{{ tasksStore.completionRate() }}% complete</span>
                  </div>
                </div>
              </a>

              <!-- Audit logs card (admin only) -->
              @if (authStore.userRole() === 'admin' || authStore.userRole() === 'owner') {
                <a
                  routerLink="/audit"
                  class="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/80 shadow-soft hover:shadow-elevated border border-slate-200/60 dark:border-slate-700/40 transition-all duration-300 hover:-translate-y-1 animate-fade-in-up stagger-2"
                >
                  <!-- Decorative gradient -->
                  <div class="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-emerald-400/20 to-transparent rounded-bl-full"></div>

                  <div class="relative p-6">
                    <div class="flex items-start justify-between mb-4">
                      <div class="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg class="w-6 h-6 text-white" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg class="w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform group-hover:translate-x-0.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    <h3 class="font-display text-lg font-semibold text-slate-900 dark:text-white mb-1">
                      Audit Logs
                    </h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Track all system activity and changes
                    </p>

                    <div class="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span class="flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Admin access
                      </span>
                      <span class="text-slate-300 dark:text-slate-600">•</span>
                      <span>View activity</span>
                    </div>
                  </div>
                </a>
              }
            </div>

            <!-- User info card -->
            <div class="rounded-2xl bg-white dark:bg-slate-800/80 shadow-soft border border-slate-200/60 dark:border-slate-700/40 overflow-hidden animate-fade-in-up stagger-3">
              <div class="p-6">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-linear-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center">
                    <span class="text-lg font-bold text-white uppercase">
                      {{ authStore.user()?.email?.charAt(0) }}
                    </span>
                  </div>
                  <div>
                    <h3 class="font-display font-semibold text-slate-900 dark:text-white">
                      {{ authStore.user()?.email }}
                    </h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400">
                      {{ authStore.userRole() | titlecase }} account
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                  <svg class="w-5 h-5 text-slate-400" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div class="flex-1">
                    <p class="text-xs text-slate-500 dark:text-slate-400">Organization ID</p>
                    <code class="text-xs font-mono text-slate-700 dark:text-slate-300">{{ authStore.organizationId() }}</code>
                  </div>
                </div>
              </div>

              <!-- Keyboard shortcuts hint -->
              <div class="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/40">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-slate-400" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p class="text-sm text-slate-500 dark:text-slate-400">
                    Press
                    <kbd class="mx-1 px-2 py-0.5 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-600 shadow-sm">
                      Shift + ?
                    </kbd>
                    to view keyboard shortcuts
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column - Task Stats -->
          <div class="animate-fade-in-up stagger-4">
            <app-task-stats />
          </div>
        </div>
      </main>
    </div>

    @if (showShortcutsDialog) {
      <app-keyboard-shortcuts-dialog (close)="showShortcutsDialog = false" />
    }
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  protected readonly authStore = inject(AuthStore);
  protected readonly tasksStore = inject(TasksStore);
  private readonly keyboardService = inject(KeyboardShortcutsService);

  protected showShortcutsDialog = false;
  private subscription?: Subscription;

  ngOnInit() {
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }

    this.subscription = this.keyboardService.shortcutTriggered$.subscribe((action) => {
      if (action === 'help') {
        this.showShortcutsDialog = true;
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  logout() {
    this.authStore.logout();
  }
}
