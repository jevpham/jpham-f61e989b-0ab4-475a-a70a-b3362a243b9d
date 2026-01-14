import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, Mock } from 'vitest';
import { AuthStore } from './auth.store';
import { AuthService } from '../../core/services/auth.service';
import { IUser, UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let authServiceMock: {
    login: Mock;
    logout: Mock;
    refreshToken: Mock;
    register: Mock;
  };
  let routerMock: { navigate: Mock };

  // Test fixtures
  const mockUser: IUser = {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'admin' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create a valid JWT token for testing (expires in 1 hour)
  const createMockToken = (expiresInSeconds: number = 3600): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: mockUser.id,
      oid: mockUser.organizationId,
      r: mockUser.role,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }));
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  };

  const mockAccessToken = createMockToken();

  const mockAuthResponse = {
    accessToken: mockAccessToken,
    user: mockUser,
  };

  beforeEach(() => {
    authServiceMock = {
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      register: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.isInitialized()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('should compute isAuthenticated as false when no token', () => {
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should compute userRole as null when no user', () => {
      expect(store.userRole()).toBeNull();
    });

    it('should compute userId as null when no user', () => {
      expect(store.userId()).toBeNull();
    });

    it('should compute organizationId as null when no user', () => {
      expect(store.organizationId()).toBeNull();
    });
  });

  describe('login', () => {
    it('should update state on successful login', async () => {
      authServiceMock.login.mockReturnValue(of(mockAuthResponse));

      store.login({ email: 'test@example.com', password: 'password123' });
      // Allow microtask queue to flush
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toEqual(mockUser);
      expect(store.accessToken()).toBe(mockAccessToken);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should set error on login failure', async () => {
      const errorResponse = { error: { message: 'Invalid credentials' } };
      authServiceMock.login.mockReturnValue(throwError(() => errorResponse));

      store.login({ email: 'test@example.com', password: 'wrong' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBe('Invalid credentials');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should set default error message when no message in response', async () => {
      authServiceMock.login.mockReturnValue(throwError(() => ({})));

      store.login({ email: 'test@example.com', password: 'wrong' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.error()).toBe('Login failed');
    });

    it('should compute isAuthenticated as true after successful login', async () => {
      authServiceMock.login.mockReturnValue(of(mockAuthResponse));

      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.isAuthenticated()).toBe(true);
    });

    it('should compute userRole after successful login', async () => {
      authServiceMock.login.mockReturnValue(of(mockAuthResponse));

      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.userRole()).toBe('admin');
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // First login to set up authenticated state
      authServiceMock.login.mockReturnValue(of(mockAuthResponse));
      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should clear state on successful logout', async () => {
      authServiceMock.logout.mockReturnValue(of(undefined));

      store.logout();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should clear state even if logout API fails', async () => {
      authServiceMock.logout.mockReturnValue(throwError(() => new Error('Network error')));

      store.logout();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should compute isAuthenticated as false after logout', async () => {
      authServiceMock.logout.mockReturnValue(of(undefined));

      store.logout();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshTokens', () => {
    it('should update tokens on successful refresh', async () => {
      const newToken = createMockToken();
      authServiceMock.refreshToken.mockReturnValue(of({
        accessToken: newToken,
        user: mockUser,
      }));

      store.refreshTokens();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.accessToken()).toBe(newToken);
      expect(store.user()).toEqual(mockUser);
    });

    it('should clear state and redirect on refresh failure', async () => {
      authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('Token expired')));

      store.refreshTokens();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('initialize', () => {
    it('should restore session on successful initialization', async () => {
      authServiceMock.refreshToken.mockReturnValue(of(mockAuthResponse));

      store.initialize();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toEqual(mockUser);
      expect(store.accessToken()).toBe(mockAccessToken);
      expect(store.isInitialized()).toBe(true);
      expect(store.isLoading()).toBe(false);
    });

    it('should mark as initialized even on failure (no valid session)', async () => {
      authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('No session')));

      store.initialize();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.user()).toBeNull();
      expect(store.accessToken()).toBeNull();
      expect(store.isInitialized()).toBe(true);
      expect(store.isLoading()).toBe(false);
    });

    it('should not navigate on initialization failure', async () => {
      authServiceMock.refreshToken.mockReturnValue(throwError(() => new Error('No session')));

      store.initialize();
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should not redirect - this is expected for new visitors
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('setAccessToken', () => {
    it('should update access token and user', () => {
      const newToken = createMockToken();
      const newUser = { ...mockUser, email: 'new@example.com' };

      store.setAccessToken(newToken, newUser);

      expect(store.accessToken()).toBe(newToken);
      expect(store.user()).toEqual(newUser);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      // First set an error
      authServiceMock.login.mockReturnValue(throwError(() => ({ error: { message: 'Error' } })));
      store.login({ email: 'test@example.com', password: 'wrong' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.error()).toBe('Error');

      store.clearError();

      expect(store.error()).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    it('should compute isAuthenticated as false for expired token', async () => {
      // Create a token that expired 1 minute ago
      const expiredToken = createMockToken(-60);
      authServiceMock.login.mockReturnValue(of({
        accessToken: expiredToken,
        user: mockUser,
      }));

      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Token is expired, so isAuthenticated should be false
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should compute isAuthenticated as false for token expiring within 30 seconds', async () => {
      // Create a token that expires in 20 seconds (within the 30-second buffer)
      const soonExpiringToken = createMockToken(20);
      authServiceMock.login.mockReturnValue(of({
        accessToken: soonExpiringToken,
        user: mockUser,
      }));

      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Token expires within buffer, so isAuthenticated should be false
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should compute isAuthenticated as true for valid non-expired token', async () => {
      // Create a token that expires in 1 hour
      const validToken = createMockToken(3600);
      authServiceMock.login.mockReturnValue(of({
        accessToken: validToken,
        user: mockUser,
      }));

      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(store.isAuthenticated()).toBe(true);
    });
  });

  describe('Computed Properties with User', () => {
    beforeEach(async () => {
      authServiceMock.login.mockReturnValue(of(mockAuthResponse));
      store.login({ email: 'test@example.com', password: 'password123' });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should return correct userId', () => {
      expect(store.userId()).toBe('user-123');
    });

    it('should return correct organizationId', () => {
      expect(store.organizationId()).toBe('org-123');
    });

    it('should return correct userRole', () => {
      expect(store.userRole()).toBe('admin');
    });
  });
});
