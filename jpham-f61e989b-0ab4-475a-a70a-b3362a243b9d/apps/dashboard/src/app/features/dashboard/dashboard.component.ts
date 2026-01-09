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
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Header -->
      <app-header title="Task Manager">
        <span slot="subtitle" class="ml-2 px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
          {{ authStore.userRole() }}
        </span>
        <button
          slot="actions"
          (click)="logout()"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Logout
        </button>
      </app-header>

      <!-- Main content -->
      <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left column - Navigation cards -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Navigation cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Tasks card -->
              <a
                routerLink="/tasks"
                class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
              >
                <div class="p-6">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Tasks</dt>
                        <dd class="text-lg font-semibold text-gray-900 dark:text-white">View Task Board</dd>
                      </dl>
                    </div>
                  </div>
                  <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Manage your tasks with drag-and-drop Kanban board
                  </p>
                </div>
              </a>

              <!-- Audit logs card (admin only) -->
              @if (authStore.userRole() === 'admin' || authStore.userRole() === 'owner') {
                <a
                  routerLink="/audit"
                  class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
                >
                  <div class="p-6">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                        <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div class="ml-5 w-0 flex-1">
                        <dl>
                          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Audit Logs</dt>
                          <dd class="text-lg font-semibold text-gray-900 dark:text-white">View Activity</dd>
                        </dl>
                      </div>
                    </div>
                    <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                      Track all system activity and changes
                    </p>
                  </div>
                </a>
              }
            </div>

            <!-- Welcome message -->
            <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Welcome back!</h2>
              <p class="text-gray-600 dark:text-gray-300">
                You're logged in as <strong>{{ authStore.user()?.email }}</strong> with
                <strong>{{ authStore.userRole() }}</strong> role.
              </p>
              <p class="text-gray-600 dark:text-gray-300 mt-2">
                Organization ID: <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{{ authStore.organizationId() }}</code>
              </p>

              <!-- Keyboard shortcuts hint -->
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Press <kbd class="px-1.5 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded">Shift + ?</kbd> to view keyboard shortcuts
                </p>
              </div>
            </div>
          </div>

          <!-- Right column - Task Stats -->
          <div>
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
    // Load tasks for stats
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }

    // Listen for keyboard shortcut to show help
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
