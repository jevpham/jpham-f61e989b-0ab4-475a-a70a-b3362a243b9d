import axios, { AxiosError } from 'axios';

/**
 * Authentication E2E Tests
 *
 * These tests verify the complete authentication flow including:
 * - User registration
 * - User login
 * - Token refresh
 * - Logout
 * - Protected route access
 */

const API_URL = process.env['API_URL'] || 'http://localhost:3000/api';

// Test user data - using unique emails to avoid conflicts
const testUser = {
  email: `e2e-auth-test-${Date.now()}@example.com`,
  password: 'SecurePassword123!',
  firstName: 'E2E',
  lastName: 'TestUser',
};

describe('Auth E2E Tests', () => {
  let accessToken: string;
  let refreshToken: string;

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, testUser);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('email', testUser.email);
      expect(response.data).not.toHaveProperty('password');
      expect(response.data).not.toHaveProperty('refreshTokenHash');
    });

    it('should reject duplicate email registration', async () => {
      try {
        await axios.post(`${API_URL}/auth/register`, testUser);
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(409);
      }
    });

    it('should validate required fields', async () => {
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: 'invalid',
          password: 'short',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should reject invalid email format', async () => {
      try {
        await axios.post(`${API_URL}/auth/register`, {
          email: 'not-an-email',
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');
      expect(typeof response.data.expiresIn).toBe('number');

      // Store tokens for subsequent tests
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
    });

    it('should reject invalid email', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'nonexistent@example.com',
          password: testUser.password,
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject invalid password', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: 'WrongPassword123!',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject missing credentials', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {});
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });
  });

  describe('Protected Routes', () => {
    it('should access protected route with valid token', async () => {
      // Assuming there's a "me" or user profile endpoint
      // If not, we can test any protected endpoint
      const response = await axios.get(`${API_URL}/organizations/user/memberships`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
    });

    it('should reject access without token', async () => {
      try {
        await axios.get(`${API_URL}/organizations/user/memberships`);
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject access with invalid token', async () => {
      try {
        await axios.get(`${API_URL}/organizations/user/memberships`, {
          headers: { Authorization: 'Bearer invalid.jwt.token' },
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject access with malformed authorization header', async () => {
      try {
        await axios.get(`${API_URL}/organizations/user/memberships`, {
          headers: { Authorization: accessToken }, // Missing "Bearer "
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const response = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.accessToken).not.toBe(accessToken);

      // Update tokens
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
    });

    it('should reject expired or invalid refresh token', async () => {
      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: 'Bearer old.invalid.refreshtoken' },
          },
        );
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should implement token rotation (old refresh token becomes invalid)', async () => {
      // First, get new tokens
      const firstRefresh = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
        },
      );

      const oldRefreshToken = refreshToken;
      refreshToken = firstRefresh.data.refreshToken;

      // Try to use the old refresh token
      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${oldRefreshToken}` },
          },
        );
        fail('Expected request to fail with old refresh token');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully and invalidate refresh token', async () => {
      // First login to get fresh tokens
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });

      const logoutAccessToken = loginResponse.data.accessToken;
      const logoutRefreshToken = loginResponse.data.refreshToken;

      // Logout
      const logoutResponse = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${logoutAccessToken}` },
        },
      );

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.data).toHaveProperty('message');

      // Verify refresh token is invalidated
      try {
        await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${logoutRefreshToken}` },
          },
        );
        fail('Expected refresh to fail after logout');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject logout without authentication', async () => {
      try {
        await axios.post(`${API_URL}/auth/logout`);
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in error responses', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        const responseData = axiosError.response?.data as Record<string, unknown>;

        // Should not expose whether email exists
        expect(responseData?.message).not.toContain('email not found');
        expect(responseData?.message).not.toContain('user does not exist');

        // Should not expose stack traces
        expect(responseData).not.toHaveProperty('stack');
      }
    });

    it('should use timing-safe comparison for passwords', async () => {
      // This tests that login time is similar for existing and non-existing users
      // to prevent timing attacks
      const start1 = Date.now();
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: 'WrongPassword123!',
        });
      } catch {
        // Expected to fail
      }
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: 'definitely-not-existing@example.com',
          password: 'WrongPassword123!',
        });
      } catch {
        // Expected to fail
      }
      const time2 = Date.now() - start2;

      // Times should be within reasonable range (accounting for network variance)
      // This is a basic check - in production, you'd want statistical analysis
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(500); // Within 500ms of each other
    });
  });
});
