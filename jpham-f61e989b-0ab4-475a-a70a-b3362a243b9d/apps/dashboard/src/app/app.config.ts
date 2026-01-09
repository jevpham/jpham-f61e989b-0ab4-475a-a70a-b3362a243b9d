import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthStore } from './store/auth/auth.store';
import { AuthService } from './core/services/auth.service';

// Initialize auth state on app startup by attempting to restore session
function initializeAuth(): () => Promise<void> {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);

  return async () => {
    try {
      // Attempt to refresh tokens using httpOnly cookie
      const response = await firstValueFrom(authService.refreshToken());
      authStore.setAccessToken(response.accessToken, response.user);
    } catch {
      // No valid session - user will need to login
      // This is expected for new visitors
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // CSRF protection: Backend validates Origin header + SameSite=strict cookies
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};
