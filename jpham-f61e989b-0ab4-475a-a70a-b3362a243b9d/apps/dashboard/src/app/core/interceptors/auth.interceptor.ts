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

  // Skip auth for public auth endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
    return next(req);
  }

  // For refresh endpoint - cookie is sent automatically with withCredentials
  // Don't add Authorization header (refresh token is in cookie)
  if (req.url.includes('/auth/refresh')) {
    return next(req);
  }

  // Add access token to requests
  const accessToken = authStore.accessToken();
  if (accessToken) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
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

  return next(req);
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
      // shareReplay ensures all concurrent requests share the same refresh call
      shareReplay(1),
      finalize(() => {
        // Clear the shared observable after completion (success or error)
        refreshInProgress$ = null;
      }),
      catchError((refreshError) => {
        // Use rxMethod for logout - wrapping in void observable pattern
        authStore.logout(undefined);
        return throwError(() => refreshError);
      }),
    );
  }

  // Wait for refresh to complete, then retry the original request
  return refreshInProgress$.pipe(
    switchMap((response) => {
      // Update store with new access token and user
      authStore.setAccessToken(response.accessToken, response.user);
      const retryReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      return next(retryReq);
    }),
  );
}
