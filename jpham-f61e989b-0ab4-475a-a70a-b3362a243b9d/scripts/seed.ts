/**
 * Database Seed Script
 *
 * Creates demo data for the Task Management System:
 * - 1 Organization (Demo Corp)
 * - 3 Users with different roles (owner, admin, viewer)
 * - Sample tasks across all statuses
 *
 * Usage: npx ts-node scripts/seed.ts
 *
 * Login credentials after seeding:
 * - owner@demo.com / password123 (Owner - full access)
 * - admin@demo.com / password123 (Admin - can create/edit/delete tasks)
 * - viewer@demo.com / password123 (Viewer - read-only access)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require('bcrypt');
const path = require('path');
const Database = require('better-sqlite3');

// Use process.cwd() since the script is run from the project root
const DB_PATH = path.join(process.cwd(), 'data', 'taskdb.sqlite');

// Generate UUIDs (simple v4-like)
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function seed() {
  console.log('Starting database seed...\n');

  const db = new Database(DB_PATH);

  // Disable foreign keys for cleanup, re-enable after seeding
  db.pragma('foreign_keys = OFF');

  // Hash password synchronously (same for all demo users)
  const passwordHash = bcrypt.hashSync('password123', 10);
  const now = new Date().toISOString();

  // Generate IDs
  const orgId = uuid();
  const ownerUserId = uuid();
  const adminUserId = uuid();
  const viewerUserId = uuid();

  try {
    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing data...');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM organization_memberships');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM organizations');
    db.exec('DELETE FROM audit_logs');

    // 1. Create Organization
    console.log('Creating organization...');
    db.prepare(`
      INSERT INTO organizations (id, name, slug, description, parentId, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orgId,
      'Demo Corp',
      'demo-corp',
      'A demo organization for testing RBAC features',
      null,
      1,
      now,
      now
    );

    // 2. Create Users
    console.log('Creating users...');

    // Owner user
    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ownerUserId, 'owner@demo.com', passwordHash, 'owner', orgId, null, 0, null, now, now);

    // Admin user
    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adminUserId, 'admin@demo.com', passwordHash, 'admin', orgId, null, 0, null, now, now);

    // Viewer user
    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(viewerUserId, 'viewer@demo.com', passwordHash, 'viewer', orgId, null, 0, null, now, now);

    // 3. Create Organization Memberships
    console.log('Creating organization memberships...');

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), ownerUserId, orgId, 'owner', now, now);

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), adminUserId, orgId, 'admin', now, now);

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), viewerUserId, orgId, 'viewer', now, now);

    // 4. Create Sample Tasks
    console.log('Creating sample tasks...');

    const tasks = [
      // To Do tasks
      {
        title: 'Review project requirements',
        description: 'Go through the initial project requirements document and identify key deliverables',
        status: 'todo',
        priority: 'high',
        category: 'work',
        position: 0,
        createdById: ownerUserId,
        assigneeId: adminUserId,
        dueDate: getFutureDate(3),
      },
      {
        title: 'Set up development environment',
        description: 'Install Node.js, NX CLI, and configure IDE extensions',
        status: 'todo',
        priority: 'medium',
        category: 'work',
        position: 1,
        createdById: adminUserId,
        assigneeId: viewerUserId,
        dueDate: getFutureDate(1),
      },
      {
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, and vegetables',
        status: 'todo',
        priority: 'low',
        category: 'shopping',
        position: 2,
        createdById: viewerUserId,
        assigneeId: null,
        dueDate: getFutureDate(0),
      },

      // In Progress tasks
      {
        title: 'Implement authentication module',
        description: 'Create JWT-based auth with login, logout, and refresh token functionality',
        status: 'in_progress',
        priority: 'urgent',
        category: 'work',
        position: 0,
        createdById: ownerUserId,
        assigneeId: adminUserId,
        dueDate: getFutureDate(2),
      },
      {
        title: 'Design database schema',
        description: 'Define entities for Users, Organizations, Tasks, and Audit Logs',
        status: 'in_progress',
        priority: 'high',
        category: 'work',
        position: 1,
        createdById: adminUserId,
        assigneeId: adminUserId,
        dueDate: getFutureDate(1),
      },

      // Review tasks
      {
        title: 'Code review: RBAC guards',
        description: 'Review the implementation of role-based access control guards',
        status: 'review',
        priority: 'high',
        category: 'work',
        position: 0,
        createdById: ownerUserId,
        assigneeId: ownerUserId,
        dueDate: getFutureDate(1),
      },
      {
        title: 'Schedule dentist appointment',
        description: 'Annual checkup and cleaning',
        status: 'review',
        priority: 'medium',
        category: 'health',
        position: 1,
        createdById: viewerUserId,
        assigneeId: null,
        dueDate: getFutureDate(7),
      },

      // Done tasks
      {
        title: 'Project kickoff meeting',
        description: 'Initial meeting with stakeholders to discuss project scope',
        status: 'done',
        priority: 'high',
        category: 'work',
        position: 0,
        createdById: ownerUserId,
        assigneeId: ownerUserId,
        dueDate: getPastDate(2),
      },
      {
        title: 'Create NX workspace',
        description: 'Initialize monorepo with NestJS API and Angular dashboard',
        status: 'done',
        priority: 'urgent',
        category: 'work',
        position: 1,
        createdById: adminUserId,
        assigneeId: adminUserId,
        dueDate: getPastDate(3),
      },
      {
        title: 'Morning run',
        description: '5K jog around the neighborhood',
        status: 'done',
        priority: 'low',
        category: 'health',
        position: 2,
        createdById: viewerUserId,
        assigneeId: null,
        dueDate: getPastDate(1),
      },
    ];

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, category, dueDate, position, organizationId, createdById, assigneeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of tasks) {
      insertTask.run(
        uuid(),
        task.title,
        task.description,
        task.status,
        task.priority,
        task.category,
        task.dueDate,
        task.position,
        orgId,
        task.createdById,
        task.assigneeId,
        now,
        now
      );
    }

    // Re-enable foreign keys and commit
    db.pragma('foreign_keys = ON');
    db.exec('COMMIT');

    console.log('\nDatabase seeded successfully!\n');
    console.log('Login Credentials:');
    console.log('-------------------------------------------');
    console.log('  Owner:  owner@demo.com  / password123');
    console.log('  Admin:  admin@demo.com  / password123');
    console.log('  Viewer: viewer@demo.com / password123');
    console.log('-------------------------------------------');
    console.log('\nRole Permissions:');
    console.log('  Owner  -> Full access (create, edit, delete tasks)');
    console.log('  Admin  -> Can create, edit, delete tasks');
    console.log('  Viewer -> Read-only (cannot create or delete tasks)');
    console.log('');

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Seed failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// Run the seed
try {
  seed();
} catch (err) {
  console.error(err);
  process.exit(1);
}
