import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, tap, switchMap, catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { IUser, LoginDto, UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

// SECURITY: Access token stored in memory only (not localStorage)
// Refresh token is in httpOnly cookie (not accessible to JavaScript)
// This prevents XSS attacks from stealing tokens

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,
};

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(window.atob(parts[1]));
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }

    // Check if token expires within the next 30 seconds (buffer for network latency)
    return payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
}

function parseJwt(token: string): { sub: string; oid: string; r: UserRole } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));

    // Validate required fields (abbreviated in JWT: sub, oid, r)
    if (!payload.sub || !payload.r) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((state) => ({
    isAuthenticated: computed(() => !!state.accessToken() && !isTokenExpired(state.accessToken()!)),
    userRole: computed(() => state.user()?.role ?? null),
    userId: computed(() => state.user()?.id ?? null),
    organizationId: computed(() => state.user()?.organizationId ?? null),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return {
      login: rxMethod<LoginDto>(
        pipe(
          tap(() => patchState(store, { isLoading: true, error: null })),
          switchMap((credentials) =>
            authService.login(credentials).pipe(
              tap((response) => {
                // User info comes from response (backend includes it)
                // Access token in memory, refresh token in httpOnly cookie (handled by browser)
                patchState(store, {
                  accessToken: response.accessToken,
                  user: response.user,
                  isLoading: false,
                });
                router.navigate(['/dashboard']);
              }),
              catchError((error) => {
                patchState(store, {
                  isLoading: false,
                  error: error.error?.message || 'Login failed',
                });
                return of(null);
              }),
            ),
          ),
        ),
      ),

      logout: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { isLoading: true })),
          switchMap(() =>
            authService.logout().pipe(
              tap(() => {
                // Clear in-memory state (cookie cleared by backend)
                patchState(store, { ...initialState });
                router.navigate(['/login']);
              }),
              catchError(() => {
                // Even if API call fails, clear local state
                patchState(store, { ...initialState });
                router.navigate(['/login']);
                return of(null);
              }),
            ),
          ),
        ),
      ),

      refreshTokens: rxMethod<void>(
        pipe(
          switchMap(() =>
            authService.refreshToken().pipe(
              tap((response) => {
                // Update access token and user from response
                patchState(store, {
                  accessToken: response.accessToken,
                  user: response.user,
                });
              }),
              catchError(() => {
                // Refresh failed - user needs to login again
                patchState(store, { ...initialState });
                router.navigate(['/login']);
                return of(null);
              }),
            ),
          ),
        ),
      ),

      // Called by interceptor after successful token refresh
      setAccessToken(accessToken: string, user: IUser) {
        patchState(store, { accessToken, user });
      },

      clearError() {
        patchState(store, { error: null });
      },
    };
  }),
);
