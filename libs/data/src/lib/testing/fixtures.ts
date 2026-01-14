/**
 * Shared test fixtures for the application.
 * These factories provide consistent mock data across all test files.
 */

import { IUser } from '../interfaces/user.interface';
import { ITask } from '../interfaces/task.interface';
import { IOrganization, IOrganizationMembership } from '../interfaces/organization.interface';
import { UserRole } from '../enums/role.enum';
import { TaskStatus, TaskPriority, TaskCategory } from '../enums/task-status.enum';

// =============================================================================
// User Fixtures
// =============================================================================

export function createMockUser(overrides: Partial<IUser> = {}): IUser {
  const now = new Date();
  return {
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const createMockOwnerUser = (overrides: Partial<IUser> = {}): IUser =>
  createMockUser({ id: 'owner-123', email: 'owner@example.com', role: 'owner', ...overrides });

export const createMockAdminUser = (overrides: Partial<IUser> = {}): IUser =>
  createMockUser({ id: 'admin-123', email: 'admin@example.com', role: 'admin', ...overrides });

export const createMockViewerUser = (overrides: Partial<IUser> = {}): IUser =>
  createMockUser({ id: 'viewer-123', email: 'viewer@example.com', role: 'viewer', ...overrides });

// =============================================================================
// Task Fixtures
// =============================================================================

export function createMockTask(overrides: Partial<ITask> = {}): ITask {
  const now = new Date();
  return {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    category: 'work' as TaskCategory,
    dueDate: null,
    position: 1,
    organizationId: 'org-123',
    createdById: 'user-123',
    assigneeId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createMockTaskList(count: number, overrides: Partial<ITask> = {}): ITask[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTask({
      id: `task-${index + 1}`,
      title: `Task ${index + 1}`,
      position: index,
      ...overrides,
    })
  );
}

// =============================================================================
// Organization Fixtures
// =============================================================================

export function createMockOrganization(overrides: Partial<IOrganization> = {}): IOrganization {
  const now = new Date();
  return {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    description: null,
    parentId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// Membership Fixtures
// =============================================================================

export function createMockMembership(overrides: Partial<IOrganizationMembership> = {}): IOrganizationMembership {
  const now = new Date();
  return {
    id: 'membership-123',
    userId: 'user-123',
    organizationId: 'org-123',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const createMockOwnerMembership = (overrides: Partial<IOrganizationMembership> = {}): IOrganizationMembership =>
  createMockMembership({ id: 'membership-owner', userId: 'owner-123', role: 'owner', ...overrides });

export const createMockAdminMembership = (overrides: Partial<IOrganizationMembership> = {}): IOrganizationMembership =>
  createMockMembership({ id: 'membership-admin', userId: 'admin-123', role: 'admin', ...overrides });

export const createMockViewerMembership = (overrides: Partial<IOrganizationMembership> = {}): IOrganizationMembership =>
  createMockMembership({ id: 'membership-viewer', userId: 'viewer-123', role: 'viewer', ...overrides });

// =============================================================================
// Angular Test Utilities
// =============================================================================

/**
 * Helper to flush pending async operations in Angular signal stores.
 * Use in tests after store methods that trigger async operations.
 */
export const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
