import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { KeyboardShortcutsService } from '../../../core/services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-dialog',
  standalone: true,
  imports: [CommonModule, A11yModule],
  template: `
    <div
      class="shortcuts-overlay"
      (click)="closeDialog.emit()"
      role="presentation"
    >
      <div
        class="shortcuts-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        aria-describedby="shortcuts-description"
        (click)="$event.stopPropagation()"
        (keydown.escape)="closeDialog.emit()"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
      >
        <header class="shortcuts-header">
          <div class="header-icon" aria-hidden="true">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9h2M11 9h2M15 9h2M7 13h6M15 13h2" />
            </svg>
          </div>
          <div class="header-text">
            <h3 id="shortcuts-title" class="header-title">Keyboard Shortcuts</h3>
            <p class="header-subtitle">Move faster around your workspace</p>
          </div>
          <button
            (click)="closeDialog.emit()"
            class="close-btn"
            type="button"
            aria-label="Close keyboard shortcuts dialog"
            cdkFocusInitial
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="shortcuts-body">
          <div class="shortcuts-list" role="list">
            @for (shortcut of shortcuts; track shortcut.key) {
              <div class="shortcut-row" role="listitem">
                <span class="shortcut-desc">{{ shortcut.description }}</span>
                <kbd class="shortcut-key">{{ keyboardService.formatShortcut(shortcut) }}</kbd>
              </div>
            }
          </div>
        </div>
        <footer class="shortcuts-footer" id="shortcuts-description">
          <span>Press</span>
          <kbd>Shift</kbd>
          <span>+</span>
          <kbd>?</kbd>
          <span>anytime to show this dialog</span>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--z-modal, 1000);
      padding: var(--space-lg, 1rem);
    }

    .shortcuts-dialog {
      width: min(560px, 100%);
      max-height: min(85vh, 720px);
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: var(--radius-xl, 1rem);
      box-shadow:
        0 30px 70px -30px rgba(15, 23, 42, 0.4),
        0 16px 30px -20px rgba(15, 23, 42, 0.3);
      overflow: hidden;
    }

    :host-context(.dark) .shortcuts-dialog {
      background: rgba(15, 23, 42, 0.95);
      border-color: rgba(71, 85, 105, 0.6);
      box-shadow:
        0 30px 70px -30px rgba(0, 0, 0, 0.65),
        0 16px 30px -22px rgba(0, 0, 0, 0.6);
    }

    .shortcuts-header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--space-md, 0.75rem);
      align-items: center;
      padding: var(--space-lg, 1rem) var(--space-xl, 1.5rem);
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(251, 146, 60, 0.14));
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    }

    :host-context(.dark) .shortcuts-header {
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(251, 146, 60, 0.12));
      border-bottom-color: rgba(71, 85, 105, 0.6);
    }

    .header-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 0.625rem);
      background: rgba(20, 184, 166, 0.15);
      color: var(--color-accent-600, #0d9488);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host-context(.dark) .header-icon {
      background: rgba(20, 184, 166, 0.25);
      color: #5eead4;
    }

    .header-title {
      font-family: var(--font-display, 'Playfair Display', Georgia, serif);
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-primary-900, #18181b);
      margin: 0;
    }

    :host-context(.dark) .header-title {
      color: var(--color-primary-50, #fafafa);
    }

    .header-subtitle {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.75rem;
      color: var(--color-primary-500, #71717a);
      margin: 0.2rem 0 0;
    }

    :host-context(.dark) .header-subtitle {
      color: var(--color-primary-400, #a1a1aa);
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md, 0.625rem);
      border: 1px solid transparent;
      background: rgba(15, 23, 42, 0.06);
      color: var(--color-primary-500, #71717a);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: rgba(15, 23, 42, 0.12);
      color: var(--color-primary-900, #18181b);
    }

    :host-context(.dark) .close-btn {
      background: rgba(148, 163, 184, 0.15);
      color: #e2e8f0;
    }

    :host-context(.dark) .close-btn:hover {
      background: rgba(148, 163, 184, 0.25);
    }

    .close-btn:focus-visible {
      outline: 2px solid #f59e0b;
      outline-offset: 2px;
    }

    .shortcuts-body {
      flex: 1;
      min-height: 0;
      padding: var(--space-lg, 1rem) var(--space-xl, 1.5rem) var(--space-sm, 0.5rem);
      overflow-y: auto;
    }

    .shortcuts-list {
      display: grid;
      gap: var(--space-sm, 0.5rem);
    }

    .shortcut-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-md, 0.75rem);
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md, 0.625rem);
      background: rgba(248, 250, 252, 0.9);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }

    :host-context(.dark) .shortcut-row {
      background: rgba(30, 41, 59, 0.7);
      border-color: rgba(71, 85, 105, 0.5);
    }

    .shortcut-desc {
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.875rem;
      color: var(--color-primary-700, #3f3f46);
    }

    :host-context(.dark) .shortcut-desc {
      color: var(--color-primary-200, #e2e8f0);
    }

    .shortcut-key {
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.75rem;
      font-weight: 600;
      background: #fff;
      border: 1px solid var(--color-primary-200, #e4e4e7);
      color: var(--color-primary-900, #18181b);
      white-space: nowrap;
    }

    :host-context(.dark) .shortcut-key {
      background: rgba(15, 23, 42, 0.85);
      border-color: rgba(148, 163, 184, 0.4);
      color: #f8fafc;
    }

    .shortcuts-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      justify-content: center;
      padding: var(--space-md, 0.75rem) var(--space-xl, 1.5rem) var(--space-lg, 1rem);
      border-top: 1px solid rgba(226, 232, 240, 0.8);
      background: rgba(248, 250, 252, 0.7);
      font-family: var(--font-body, 'DM Sans', sans-serif);
      font-size: 0.75rem;
      color: var(--color-primary-500, #71717a);
    }

    :host-context(.dark) .shortcuts-footer {
      border-top-color: rgba(71, 85, 105, 0.6);
      background: rgba(15, 23, 42, 0.6);
      color: var(--color-primary-400, #a1a1aa);
    }

    .shortcuts-footer kbd {
      padding: 0.2rem 0.45rem;
      border-radius: 0.375rem;
      background: #fff;
      border: 1px solid var(--color-primary-200, #e4e4e7);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--color-primary-900, #18181b);
    }

    :host-context(.dark) .shortcuts-footer kbd {
      background: rgba(30, 41, 59, 0.9);
      border-color: rgba(71, 85, 105, 0.6);
      color: #f8fafc;
    }

    @media (max-width: 480px) {
      .shortcuts-header {
        padding: var(--space-md, 0.75rem) var(--space-lg, 1rem);
      }

      .shortcuts-body {
        padding: var(--space-md, 0.75rem) var(--space-lg, 1rem);
      }

      .shortcuts-footer {
        padding: var(--space-md, 0.75rem) var(--space-lg, 1rem);
      }

      .shortcut-row {
        grid-template-columns: 1fr;
        align-items: start;
      }

      .shortcut-key {
        justify-self: start;
      }
    }
  `],
})
export class KeyboardShortcutsDialogComponent {
  @Output() closeDialog = new EventEmitter<void>();

  protected readonly keyboardService = inject(KeyboardShortcutsService);
  protected readonly shortcuts = this.keyboardService.getShortcuts();
}
