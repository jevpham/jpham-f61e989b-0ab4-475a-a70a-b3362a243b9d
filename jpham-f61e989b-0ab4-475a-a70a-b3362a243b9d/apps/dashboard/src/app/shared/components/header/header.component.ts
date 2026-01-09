import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthStore } from '../../../store/auth/auth.store';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div class="flex items-center gap-4">
          @if (showBackButton) {
            <a [routerLink]="backRoute" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
          }
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title }}</h1>
          <ng-content select="[slot=subtitle]"></ng-content>
        </div>

        <div class="flex items-center gap-4">
          <ng-content select="[slot=actions]"></ng-content>

          <!-- Theme Toggle -->
          <button
            (click)="themeService.toggleDarkMode()"
            class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            [title]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (themeService.isDark()) {
              <!-- Sun icon -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <!-- Moon icon -->
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <!-- User Menu -->
          <div class="relative">
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {{ authStore.user()?.email }}
            </span>
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
