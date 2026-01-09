import { Injectable, inject, NgZone, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ThemeService } from './theme.service';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly shortcutTriggered$ = new Subject<string>();

  private shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      ctrl: true,
      description: 'Toggle dark mode',
      action: () => this.themeService.toggleDarkMode(),
    },
    {
      key: 'h',
      ctrl: true,
      description: 'Go to dashboard',
      action: () => this.router.navigate(['/dashboard']),
    },
    {
      key: 't',
      ctrl: true,
      description: 'Go to task board',
      action: () => this.router.navigate(['/tasks']),
    },
    {
      key: 'a',
      ctrl: true,
      shift: true,
      description: 'Go to audit logs',
      action: () => this.router.navigate(['/audit']),
    },
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      action: () => this.shortcutTriggered$.next('help'),
    },
  ];

  constructor() {
    // Complete subject on destroy
    this.destroyRef.onDestroy(() => {
      this.shortcutTriggered$.complete();
    });

    this.ngZone.runOutsideAngular(() => {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter((event) => {
            // Don't trigger shortcuts when typing in inputs or contenteditable elements
            const target = event.target as HTMLElement;
            const isFormElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
            return !isFormElement && !isContentEditable;
          }),
        )
        .subscribe((event) => {
          this.handleKeydown(event);
        });
    });
  }

  private handleKeydown(event: KeyboardEvent) {
    const matchingShortcut = this.shortcuts.find((shortcut) => {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      this.ngZone.run(() => {
        matchingShortcut.action();
      });
    }
  }

  getShortcuts(): KeyboardShortcut[] {
    return this.shortcuts;
  }

  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }
}
