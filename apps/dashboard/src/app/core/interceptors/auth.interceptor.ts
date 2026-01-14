import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError, shareReplay, finalize } from 'rxjs';
import { AuthStore } from '../../store/auth/auth.store';
import { AuthService, AuthResponse } from '../services/auth.service';

// Singleton refresh observable - shared across all concurrent 401 errors
let refreshInProgress$: Observable<AuthResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);

  // Always add withCredentials for cookie support and CSRF header
  const baseHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
  };

  // For public auth endpoints (login/register) - add credentials for cookies but no auth header
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    const clonedReq = req.clone({
      withCredentials: true,
      setHeaders: baseHeaders,
    });
    return next(clonedReq);
  }

  // For refresh endpoint - cookie is sent automatically with withCredentials
  // Don't add Authorization header (refresh token is in cookie)
  if (req.url.includes('/auth/refresh')) {
    const clonedReq = req.clone({
      withCredentials: true,
      setHeaders: baseHeaders,
    });
    return next(clonedReq);
  }

  // Add access token to authenticated requests
  const accessToken = authStore.accessToken();
  if (accessToken) {
    const clonedReq = req.clone({
      withCredentials: true,
      setHeaders: {
        ...baseHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return next(clonedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          return handleTokenRefresh(authStore, authService, req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  // Unauthenticated requests still need withCredentials for cookie support
  const clonedReq = req.clone({
    withCredentials: true,
    setHeaders: baseHeaders,
  });
  return next(clonedReq);
};

function handleTokenRefresh(
  authStore: InstanceType<typeof AuthStore>,
  authService: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  // If refresh is already in progress, reuse the same observable
  if (!refreshInProgress$) {
    refreshInProgress$ = authService.refreshToken().pipe(
      // catchError before shareReplay to handle errors once, not per subscriber
      catchError((refreshError) => {
        // Clear the shared observable immediately on error
        refreshInProgress$ = null;
        // Trigger logout synchronously to prevent race conditions
        authStore.logout(undefined);
        return throwError(() => refreshError);
      }),
      // shareReplay with refCount: true cleans up when all subscribers unsubscribe
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        // Clear the shared observable after successful completion
        refreshInProgress$ = null;
      }),
    );
  }

  // Wait for refresh to complete, then retry the original request
  return refreshInProgress$.pipe(
    switchMap((response) => {
      // Update store with new access token and user
      authStore.setAccessToken(response.accessToken, response.user);
      const retryReq = req.clone({
        withCredentials: true,
        setHeaders: {
          'X-Requested-With': 'XMLHttpRequest',
          Authorization: `Bearer ${response.accessToken}`,
        },
      });
      return next(retryReq);
    }),
  );
}
