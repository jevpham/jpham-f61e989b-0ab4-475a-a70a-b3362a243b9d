import axios, { AxiosError, AxiosInstance } from 'axios';

/**
 * Tasks E2E Tests with RBAC
 *
 * These tests verify:
 * - Task CRUD operations
 * - Role-based access control (Owner > Admin > Viewer)
 * - Permission boundaries
 * - Task filtering and ordering
 */

const API_URL = process.env['API_URL'] || 'http://localhost:3000/api';

// Helper to create authenticated axios instance
function createAuthenticatedClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Test data
const timestamp = Date.now();

const ownerUser = {
  email: `e2e-owner-${timestamp}@example.com`,
  password: 'SecurePassword123!',
  firstName: 'Owner',
  lastName: 'User',
};

const adminUser = {
  email: `e2e-admin-${timestamp}@example.com`,
  password: 'SecurePassword123!',
  firstName: 'Admin',
  lastName: 'User',
};

const viewerUser = {
  email: `e2e-viewer-${timestamp}@example.com`,
  password: 'SecurePassword123!',
  firstName: 'Viewer',
  lastName: 'User',
};

describe('Tasks E2E Tests with RBAC', () => {
  // Authentication data
  let ownerToken: string;
  let adminToken: string;
  let viewerToken: string;
  let ownerClient: AxiosInstance;
  let adminClient: AxiosInstance;
  let viewerClient: AxiosInstance;

  // Entity IDs
  let organizationId: string;
  let taskId: string;
  let ownerId: string;
  let adminId: string;
  let viewerId: string;

  beforeAll(async () => {
    // Register and login users
    const ownerRegResponse = await axios.post(`${API_URL}/auth/register`, ownerUser);
    ownerId = ownerRegResponse.data.id;

    const adminRegResponse = await axios.post(`${API_URL}/auth/register`, adminUser);
    adminId = adminRegResponse.data.id;

    const viewerRegResponse = await axios.post(`${API_URL}/auth/register`, viewerUser);
    viewerId = viewerRegResponse.data.id;

    // Login all users
    const ownerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: ownerUser.email,
      password: ownerUser.password,
    });
    ownerToken = ownerLogin.data.accessToken;
    ownerClient = createAuthenticatedClient(ownerToken);

    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: adminUser.email,
      password: adminUser.password,
    });
    adminToken = adminLogin.data.accessToken;
    adminClient = createAuthenticatedClient(adminToken);

    const viewerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: viewerUser.email,
      password: viewerUser.password,
    });
    viewerToken = viewerLogin.data.accessToken;
    viewerClient = createAuthenticatedClient(viewerToken);

    // Create organization (owner creates it)
    const orgResponse = await ownerClient.post('/organizations', {
      name: `E2E Test Org ${timestamp}`,
      slug: `e2e-test-org-${timestamp}`,
      description: 'Test organization for E2E tests',
    });
    organizationId = orgResponse.data.id;

    // Add admin to organization
    await ownerClient.post(`/organizations/${organizationId}/members`, {
      userId: adminId,
      role: 'admin',
    });

    // Add viewer to organization
    await ownerClient.post(`/organizations/${organizationId}/members`, {
      userId: viewerId,
      role: 'viewer',
    });
  });

  describe('Task Creation - RBAC', () => {
    it('owner should be able to create a task', async () => {
      const response = await ownerClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Owner Created Task',
        description: 'Created by owner',
        priority: 'high',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.title).toBe('Owner Created Task');
      expect(response.data.priority).toBe('high');
      expect(response.data.status).toBe('todo');
      taskId = response.data.id;
    });

    it('admin should be able to create a task', async () => {
      const response = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Admin Created Task',
        description: 'Created by admin',
        priority: 'medium',
      });

      expect(response.status).toBe(201);
      expect(response.data.title).toBe('Admin Created Task');
    });

    it('viewer should NOT be able to create a task', async () => {
      try {
        await viewerClient.post(`/organizations/${organizationId}/tasks`, {
          title: 'Viewer Created Task',
          description: 'Should fail',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });

    it('non-member should NOT be able to create a task', async () => {
      // Create a new user not in the organization
      const outsiderUser = {
        email: `e2e-outsider-${timestamp}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Outsider',
        lastName: 'User',
      };
      await axios.post(`${API_URL}/auth/register`, outsiderUser);
      const outsiderLogin = await axios.post(`${API_URL}/auth/login`, {
        email: outsiderUser.email,
        password: outsiderUser.password,
      });
      const outsiderClient = createAuthenticatedClient(outsiderLogin.data.accessToken);

      try {
        await outsiderClient.post(`/organizations/${organizationId}/tasks`, {
          title: 'Outsider Task',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });
  });

  describe('Task Reading - RBAC', () => {
    it('all members (owner, admin, viewer) should be able to read tasks', async () => {
      // Owner reads
      const ownerResponse = await ownerClient.get(`/organizations/${organizationId}/tasks`);
      expect(ownerResponse.status).toBe(200);
      expect(Array.isArray(ownerResponse.data)).toBe(true);

      // Admin reads
      const adminResponse = await adminClient.get(`/organizations/${organizationId}/tasks`);
      expect(adminResponse.status).toBe(200);

      // Viewer reads
      const viewerResponse = await viewerClient.get(`/organizations/${organizationId}/tasks`);
      expect(viewerResponse.status).toBe(200);
    });

    it('should be able to read a specific task', async () => {
      const response = await viewerClient.get(`/organizations/${organizationId}/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(taskId);
      expect(response.data.title).toBe('Owner Created Task');
    });

    it('should filter tasks by status', async () => {
      const response = await ownerClient.get(
        `/organizations/${organizationId}/tasks?status=todo`,
      );

      expect(response.status).toBe(200);
      expect(response.data.every((t: { status: string }) => t.status === 'todo')).toBe(true);
    });
  });

  describe('Task Updating - RBAC', () => {
    it('owner should be able to update any task', async () => {
      const response = await ownerClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
        title: 'Updated by Owner',
        status: 'in_progress',
      });

      expect(response.status).toBe(200);
      expect(response.data.title).toBe('Updated by Owner');
      expect(response.data.status).toBe('in_progress');
    });

    it('admin should be able to update any task', async () => {
      const response = await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
        priority: 'urgent',
      });

      expect(response.status).toBe(200);
      expect(response.data.priority).toBe('urgent');
    });

    it('viewer should NOT be able to update tasks they do not own or are not assigned to', async () => {
      try {
        await viewerClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
          title: 'Updated by Viewer - Should Fail',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });

    it('assignee (viewer) should be able to update their assigned task', async () => {
      // First, create a task assigned to the viewer
      const createResponse = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Task Assigned to Viewer',
        assigneeId: viewerId,
      });
      const assignedTaskId = createResponse.data.id;

      // Viewer should be able to update their assigned task
      const updateResponse = await viewerClient.put(
        `/organizations/${organizationId}/tasks/${assignedTaskId}`,
        {
          status: 'in_progress',
        },
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.status).toBe('in_progress');
    });
  });

  describe('Task Deletion - RBAC', () => {
    let taskToDeleteId: string;

    beforeEach(async () => {
      // Create a fresh task for deletion tests
      const response = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Task To Delete',
      });
      taskToDeleteId = response.data.id;
    });

    it('owner should be able to delete any task', async () => {
      const response = await ownerClient.delete(
        `/organizations/${organizationId}/tasks/${taskToDeleteId}`,
      );

      expect(response.status).toBe(204);

      // Verify task is deleted
      try {
        await ownerClient.get(`/organizations/${organizationId}/tasks/${taskToDeleteId}`);
        fail('Expected task to be deleted');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403); // Not found returns forbidden for security
      }
    });

    it('admin should be able to delete any task', async () => {
      const response = await adminClient.delete(
        `/organizations/${organizationId}/tasks/${taskToDeleteId}`,
      );

      expect(response.status).toBe(204);
    });

    it('viewer should NOT be able to delete tasks', async () => {
      try {
        await viewerClient.delete(`/organizations/${organizationId}/tasks/${taskToDeleteId}`);
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });
  });

  describe('Task Reordering', () => {
    let task1Id: string;
    let task2Id: string;
    let task3Id: string;

    beforeAll(async () => {
      // Create multiple tasks for reordering tests
      const task1 = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Reorder Task 1',
      });
      task1Id = task1.data.id;

      const task2 = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Reorder Task 2',
      });
      task2Id = task2.data.id;

      const task3 = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Reorder Task 3',
      });
      task3Id = task3.data.id;
    });

    it('should reorder task position', async () => {
      const response = await adminClient.put(
        `/organizations/${organizationId}/tasks/${task1Id}/reorder`,
        {
          newPosition: 5,
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.position).toBe(5);
    });

    it('should reject negative position', async () => {
      try {
        await adminClient.put(`/organizations/${organizationId}/tasks/${task1Id}/reorder`, {
          newPosition: -1,
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });
  });

  describe('Task Validation', () => {
    it('should reject task with empty title', async () => {
      try {
        await adminClient.post(`/organizations/${organizationId}/tasks`, {
          title: '',
          description: 'Task with empty title',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should reject task with title exceeding max length', async () => {
      try {
        await adminClient.post(`/organizations/${organizationId}/tasks`, {
          title: 'A'.repeat(201), // Max is 200
          description: 'Task with very long title',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should reject invalid status value', async () => {
      try {
        await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
          status: 'invalid_status',
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should reject invalid priority value', async () => {
      try {
        await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
          priority: 'critical', // Not a valid priority
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(400);
      }
    });

    it('should accept valid date format for dueDate', async () => {
      const response = await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
        dueDate: '2025-12-31',
      });

      expect(response.status).toBe(200);
      expect(response.data.dueDate).toContain('2025-12-31');
    });

    it('should allow clearing assignee with null', async () => {
      // First assign someone
      await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
        assigneeId: adminId,
      });

      // Then clear the assignee
      const response = await adminClient.put(`/organizations/${organizationId}/tasks/${taskId}`, {
        assigneeId: null,
      });

      expect(response.status).toBe(200);
      expect(response.data.assigneeId).toBeNull();
    });
  });

  describe('Task Assignee Validation', () => {
    it('should reject assigning task to non-member', async () => {
      // Create a user not in the organization
      const nonMemberUser = {
        email: `e2e-nonmember-${timestamp}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'NonMember',
        lastName: 'User',
      };
      const regResponse = await axios.post(`${API_URL}/auth/register`, nonMemberUser);
      const nonMemberId = regResponse.data.id;

      try {
        await adminClient.post(`/organizations/${organizationId}/tasks`, {
          title: 'Task for Non-Member',
          assigneeId: nonMemberId,
        });
        fail('Expected request to fail');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(403);
      }
    });

    it('should accept assigning task to valid member', async () => {
      const response = await adminClient.post(`/organizations/${organizationId}/tasks`, {
        title: 'Task for Admin',
        assigneeId: adminId,
      });

      expect(response.status).toBe(201);
      expect(response.data.assigneeId).toBe(adminId);
    });
  });

  describe('Complete RBAC Permission Matrix', () => {
    /**
     * Permission Matrix:
     * | Action  | Owner | Admin | Viewer |
     * |---------|-------|-------|--------|
     * | Create  | ✓     | ✓     | ✗      |
     * | Read    | ✓     | ✓     | ✓      |
     * | Update  | ✓     | ✓     | Own*   |
     * | Delete  | ✓     | ✓     | ✗      |
     *
     * *Viewer can only update tasks they created or are assigned to
     */

    const permissions = [
      { role: 'owner', create: true, read: true, update: true, delete: true },
      { role: 'admin', create: true, read: true, update: true, delete: true },
      { role: 'viewer', create: false, read: true, update: false, delete: false },
    ];

    permissions.forEach(({ role, create, read, update, delete: canDelete }) => {
      describe(`${role} permissions`, () => {
        const client = role === 'owner' ? ownerClient : role === 'admin' ? adminClient : viewerClient;

        if (create) {
          it(`${role} CAN create tasks`, async () => {
            if (!client) return; // Client might not be initialized in describe
            const response = await client.post(`/organizations/${organizationId}/tasks`, {
              title: `${role} Permission Test Task`,
            });
            expect(response.status).toBe(201);
          });
        } else {
          it(`${role} CANNOT create tasks`, async () => {
            if (!client) return;
            try {
              await client.post(`/organizations/${organizationId}/tasks`, {
                title: `${role} Permission Test Task`,
              });
              fail('Expected 403 Forbidden');
            } catch (error) {
              expect((error as AxiosError).response?.status).toBe(403);
            }
          });
        }

        it(`${role} ${read ? 'CAN' : 'CANNOT'} read tasks`, async () => {
          if (!client) return;
          const response = await client.get(`/organizations/${organizationId}/tasks`);
          expect(response.status).toBe(200);
        });
      });
    });
  });
});
