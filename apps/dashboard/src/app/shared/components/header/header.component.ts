import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthStore } from '../../../store/auth/auth.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="glass-card border-b border-slate-200/60 dark:border-slate-700/40 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center">
          <!-- Left side -->
          <div class="flex items-center gap-5 animate-fade-in-up">
            @if (showBackButton) {
              <a
                [routerLink]="backRoute"
                class="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200"
              >
                <svg class="h-5 w-5 transition-transform group-hover:-translate-x-0.5" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>
            }
            <div class="flex items-center gap-3">
              <!-- Logo -->
              <div class="w-9 h-9 rounded-lg bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                <svg class="w-5 h-5 text-white" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 class="font-display text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
                  {{ title }}
                </h1>
              </div>
            </div>
            <ng-content select="[slot=subtitle]"></ng-content>
          </div>

          <!-- Right side -->
          <div class="flex items-center gap-3">
            <ng-content select="[slot=actions]"></ng-content>

            <!-- Theme Toggle -->
            <button
              (click)="themeService.toggleDarkMode()"
              class="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all duration-200 focus-ring"
              [title]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              @if (themeService.isDark()) {
                <!-- Sun icon -->
                <svg class="w-5 h-5 absolute inset-0 m-auto" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              } @else {
                <!-- Moon icon -->
                <svg class="w-5 h-5 absolute inset-0 m-auto" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              }
            </button>

            <!-- User Avatar -->
            <div class="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-700">
              <div class="w-8 h-8 rounded-lg bg-linear-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700 flex items-center justify-center">
                <span class="text-xs font-bold text-white uppercase">
                  {{ authStore.user()?.email?.charAt(0) }}
                </span>
              </div>
              <span class="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 max-w-32 truncate">
                {{ authStore.user()?.email }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  @Input() title = '';
  @Input() showBackButton = false;
  @Input() backRoute = '/dashboard';

  protected readonly themeService = inject(ThemeService);
  protected readonly authStore = inject(AuthStore);
}
