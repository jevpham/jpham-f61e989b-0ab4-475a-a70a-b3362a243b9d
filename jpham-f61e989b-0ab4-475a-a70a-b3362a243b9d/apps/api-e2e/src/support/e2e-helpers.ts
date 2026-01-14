import axios, { AxiosInstance } from 'axios';

const API_URL = process.env['API_URL'] || 'http://localhost:3000/api';

// =============================================================================
// Test User Creation
// =============================================================================

export interface TestUser {
  email: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
}

/**
 * Creates a test user object with unique email and organization.
 * @param prefix - Prefix for identifying the user type (e.g., 'owner', 'admin')
 */
export function createTestUser(prefix: string): TestUser {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    email: `e2e-${prefix}-${timestamp}-${random}@example.com`,
    password: 'SecurePassword123!',
    organizationName: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} Test Org`,
    organizationSlug: `${prefix}-org-${timestamp}-${random}`,
  };
}

// =============================================================================
// Authenticated Client
// =============================================================================

/**
 * Creates an axios instance with Bearer token authentication.
 */
export function createAuthenticatedClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// =============================================================================
// Authentication Helpers
// =============================================================================

export interface AuthResult {
  accessToken: string;
  userId: string;
  organizationId: string;
  client: AxiosInstance;
}

/**
 * Registers a new user and returns authentication data.
 */
export async function registerUser(user: TestUser): Promise<AuthResult> {
  // Register
  const registerResponse = await axios.post(`${API_URL}/auth/register`, user);
  const userId = registerResponse.data.id;
  const organizationId = registerResponse.data.organizationId;

  // Login to get token
  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: user.email,
    password: user.password,
  });

  const accessToken = loginResponse.data.accessToken;

  return {
    accessToken,
    userId,
    organizationId,
    client: createAuthenticatedClient(accessToken),
  };
}

/**
 * Logs in an existing user and returns authentication data.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; client: AxiosInstance }> {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });

  const accessToken = response.data.accessToken;

  return {
    accessToken,
    client: createAuthenticatedClient(accessToken),
  };
}

/**
 * Registers a user, logs in, and returns everything needed for testing.
 * This is a convenience function combining createTestUser, registerUser.
 */
export async function setupTestUser(prefix: string): Promise<AuthResult & { user: TestUser }> {
  const user = createTestUser(prefix);
  const authResult = await registerUser(user);
  return { ...authResult, user };
}

// =============================================================================
// Member Management Helpers
// =============================================================================

/**
 * Adds a member to an organization with a specific role.
 */
export async function addMemberToOrganization(
  client: AxiosInstance,
  organizationId: string,
  userId: string,
  role: 'owner' | 'admin' | 'viewer',
): Promise<void> {
  await client.post(`/organizations/${organizationId}/members`, {
    userId,
    role,
  });
}
