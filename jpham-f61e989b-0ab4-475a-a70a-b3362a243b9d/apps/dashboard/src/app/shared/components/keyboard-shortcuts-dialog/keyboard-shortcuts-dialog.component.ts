import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService } from '../../../core/services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      (click)="close.emit()"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        (click)="$event.stopPropagation()"
      >
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h3>
          <button
            (click)="close.emit()"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6">
          <div class="space-y-3">
            @for (shortcut of shortcuts; track shortcut.key) {
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ shortcut.description }}
                </span>
                <kbd class="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                  {{ keyboardService.formatShortcut(shortcut) }}
                </kbd>
              </div>
            }
          </div>

          <p class="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd class="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Shift + ?</kbd> anytime to show this dialog
          </p>
        </div>
      </div>
    </div>
  `,
})
export class KeyboardShortcutsDialogComponent {
  @Output() close = new EventEmitter<void>();

  protected readonly keyboardService = inject(KeyboardShortcutsService);
  protected readonly shortcuts = this.keyboardService.getShortcuts();
}
