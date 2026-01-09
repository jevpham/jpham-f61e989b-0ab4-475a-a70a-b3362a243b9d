import { Injectable, signal, effect, OnDestroy } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
const VALID_THEMES: readonly Theme[] = ['light', 'dark', 'system'] as const;

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private readonly _theme = signal<Theme>(this.loadTheme());
  private mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
  private mediaQuery: MediaQueryList | null = null;

  readonly theme = this._theme.asReadonly();
  readonly isDark = signal<boolean>(false);

  constructor() {
    effect(() => {
      const theme = this._theme();
      this.applyTheme(theme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_KEY, theme);
      }
    });

    // Listen for system preference changes
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQueryListener = () => {
        if (this._theme() === 'system') {
          this.applyTheme('system');
        }
      };
      this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    }
  }

  ngOnDestroy(): void {
    // Cleanup event listener to prevent memory leak
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  private isValidTheme(value: string | null): value is Theme {
    return value !== null && VALID_THEMES.includes(value as Theme);
  }

  private loadTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_KEY);
    // Validate stored value to prevent invalid themes
    return this.isValidTheme(stored) ? stored : 'system';
  }

  private applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;

    let isDark: boolean;
    if (theme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = theme === 'dark';
    }

    this.isDark.set(isDark);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme: Theme) {
    this._theme.set(theme);
  }

  toggleDarkMode() {
    if (typeof window === 'undefined') return;

    const current = this._theme();
    if (current === 'system') {
      // Switch to explicit light/dark based on current system preference
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._theme.set(systemDark ? 'light' : 'dark');
    } else {
      this._theme.set(current === 'dark' ? 'light' : 'dark');
    }
  }
}
