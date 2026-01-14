/**
 * Database Seed Script
 *
 * Creates demo data for the Task Management System:
 * - 1 Organization (Demo Corp)
 * - 3 Users with different roles (owner, admin, viewer)
 * - Sample tasks across all statuses
 *
 * Usage: node scripts/seed.js
 *        node scripts/seed.js --force  (re-seed existing data)
 *
 * SECURITY: This script is for DEVELOPMENT ONLY.
 * It will refuse to run if NODE_ENV=production.
 */

const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(process.cwd(), 'data', 'taskdb.sqlite');
const BCRYPT_ROUNDS = 10; // Should match apps/api configuration

// ============================================
// SECURITY CHECKS
// ============================================

// Prevent running in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: Seed script must not run in production environment!');
  console.error('This script creates demo accounts with known credentials.');
  process.exit(1);
}

// Default password meets validation requirements:
// - 8+ characters, uppercase, lowercase, number, special character
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Demo@123';
if (SEED_PASSWORD === 'Demo@123') {
  console.warn('WARNING: Using default demo password. Set SEED_PASSWORD env var for custom password.\n');
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

function seed() {
  console.log('Starting database seed...\n');

  const db = new Database(DB_PATH);

  try {
    // Disable foreign keys for cleanup (will re-enable in finally block)
    db.pragma('foreign_keys = OFF');

    // Verify database schema exists
    try {
      db.prepare('SELECT 1 FROM users LIMIT 1').get();
      db.prepare('SELECT 1 FROM organizations LIMIT 1').get();
      db.prepare('SELECT 1 FROM tasks LIMIT 1').get();
    } catch (schemaError) {
      console.error('ERROR: Database schema not initialized. Run the API server first to create tables.');
      process.exit(1);
    }

    // Idempotency check
    const existingOrg = db.prepare('SELECT id FROM organizations WHERE slug = ?').get('demo-corp');
    if (existingOrg && !process.argv.includes('--force')) {
      console.log('Seed data already exists (Demo Corp organization found).');
      console.log('Use --force flag to re-seed: node scripts/seed.js --force\n');
      db.pragma('foreign_keys = ON');
      db.close();
      process.exit(0);
    }

    if (existingOrg) {
      console.log('Force flag detected, re-seeding...\n');
      console.warn('WARNING: This will delete all data from the demo organization (Demo Corp).');
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(SEED_PASSWORD, BCRYPT_ROUNDS);
    const now = new Date().toISOString();

    // Generate cryptographically secure UUIDs
    const orgId = randomUUID();
    const ownerUserId = randomUUID();
    const adminUserId = randomUUID();
    const viewerUserId = randomUUID();

    // Validate UUIDs were generated
    if (!orgId || !ownerUserId || !adminUserId || !viewerUserId) {
      throw new Error('Failed to generate required UUIDs');
    }

    // Start transaction
    db.exec('BEGIN TRANSACTION');

    // Clear existing demo data only (scoped to demo organization for safety)
    console.log('Clearing existing demo data...');
    if (existingOrg) {
      const demoOrgId = existingOrg.id;

      // Get demo user IDs for scoped deletion
      const demoUsers = db.prepare('SELECT id FROM users WHERE organizationId = ?').all(demoOrgId);
      const demoUserIds = demoUsers.map(u => u.id);

      // Delete audit logs for demo users
      if (demoUserIds.length > 0) {
        const userPlaceholders = demoUserIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM audit_logs WHERE userId IN (${userPlaceholders})`).run(...demoUserIds);
      }

      // Delete tasks in demo organization
      db.prepare('DELETE FROM tasks WHERE organizationId = ?').run(demoOrgId);

      // Delete organization memberships for demo org
      db.prepare('DELETE FROM organization_memberships WHERE organizationId = ?').run(demoOrgId);

      // Delete users in demo organization
      db.prepare('DELETE FROM users WHERE organizationId = ?').run(demoOrgId);

      // Delete the demo organization itself
      db.prepare('DELETE FROM organizations WHERE id = ?').run(demoOrgId);
    }

    // 1. Create Organization
    console.log('Creating organization...');
    db.prepare(`
      INSERT INTO organizations (id, name, slug, description, parentId, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, 'Demo Corp', 'demo-corp', 'A demo organization for testing RBAC features', null, 1, now, now);

    // 2. Create Users
    console.log('Creating users...');

    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ownerUserId, 'owner@demo.com', passwordHash, 'owner', orgId, null, 0, null, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adminUserId, 'admin@demo.com', passwordHash, 'admin', orgId, null, 0, null, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password, role, organizationId, refreshTokenHash, failedLoginAttempts, lockoutUntil, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(viewerUserId, 'viewer@demo.com', passwordHash, 'viewer', orgId, null, 0, null, now, now);

    // 3. Create Organization Memberships
    console.log('Creating organization memberships...');

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), ownerUserId, orgId, 'owner', now, now);

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), adminUserId, orgId, 'admin', now, now);

    db.prepare(`
      INSERT INTO organization_memberships (id, userId, organizationId, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), viewerUserId, orgId, 'viewer', now, now);

    // 4. Create Sample Tasks
    console.log('Creating sample tasks...');

    const tasks = [
      // To Do tasks
      { title: 'Review project requirements', description: 'Go through the initial project requirements document', status: 'todo', priority: 'high', category: 'work', position: 0, createdById: ownerUserId, assigneeId: adminUserId, dueDate: getFutureDate(3) },
      { title: 'Set up development environment', description: 'Install Node.js, NX CLI, and configure IDE', status: 'todo', priority: 'medium', category: 'work', position: 1, createdById: adminUserId, assigneeId: viewerUserId, dueDate: getFutureDate(1) },
      { title: 'Buy groceries', description: 'Milk, eggs, bread, and vegetables', status: 'todo', priority: 'low', category: 'shopping', position: 2, createdById: viewerUserId, assigneeId: null, dueDate: getFutureDate(0) },

      // In Progress tasks
      { title: 'Implement authentication module', description: 'Create JWT-based auth with login and refresh', status: 'in_progress', priority: 'urgent', category: 'work', position: 0, createdById: ownerUserId, assigneeId: adminUserId, dueDate: getFutureDate(2) },
      { title: 'Design database schema', description: 'Define entities for Users, Organizations, Tasks', status: 'in_progress', priority: 'high', category: 'work', position: 1, createdById: adminUserId, assigneeId: adminUserId, dueDate: getFutureDate(1) },

      // Review tasks
      { title: 'Code review: RBAC guards', description: 'Review role-based access control implementation', status: 'review', priority: 'high', category: 'work', position: 0, createdById: ownerUserId, assigneeId: ownerUserId, dueDate: getFutureDate(1) },
      { title: 'Schedule dentist appointment', description: 'Annual checkup and cleaning', status: 'review', priority: 'medium', category: 'health', position: 1, createdById: viewerUserId, assigneeId: null, dueDate: getFutureDate(7) },

      // Done tasks
      { title: 'Project kickoff meeting', description: 'Initial meeting with stakeholders', status: 'done', priority: 'high', category: 'work', position: 0, createdById: ownerUserId, assigneeId: ownerUserId, dueDate: getPastDate(2) },
      { title: 'Create NX workspace', description: 'Initialize monorepo with NestJS and Angular', status: 'done', priority: 'urgent', category: 'work', position: 1, createdById: adminUserId, assigneeId: adminUserId, dueDate: getPastDate(3) },
      { title: 'Morning run', description: '5K jog around the neighborhood', status: 'done', priority: 'low', category: 'health', position: 2, createdById: viewerUserId, assigneeId: null, dueDate: getPastDate(1) },
    ];

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, category, dueDate, position, organizationId, createdById, assigneeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of tasks) {
      insertTask.run(randomUUID(), task.title, task.description, task.status, task.priority, task.category, task.dueDate, task.position, orgId, task.createdById, task.assigneeId, now, now);
    }

    // Commit transaction
    db.exec('COMMIT');

    console.log('\n========================================');
    console.log('  Database seeded successfully!');
    console.log('========================================\n');
    console.log('Login Credentials:');
    console.log('------------------------------------------');
    console.log('  Owner:  owner@demo.com  / ' + (SEED_PASSWORD === 'Demo@123' ? 'Demo@123' : '[custom]'));
    console.log('  Admin:  admin@demo.com  / ' + (SEED_PASSWORD === 'Demo@123' ? 'Demo@123' : '[custom]'));
    console.log('  Viewer: viewer@demo.com / ' + (SEED_PASSWORD === 'Demo@123' ? 'Demo@123' : '[custom]'));
    console.log('------------------------------------------\n');
    console.log('Role Permissions:');
    console.log('  Owner  -> Full access (create, edit, delete)');
    console.log('  Admin  -> Can create, edit, delete tasks');
    console.log('  Viewer -> Read-only (cannot create/delete)\n');

  } catch (error) {
    // Rollback on any error
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // Transaction may not have started, ignore
    }
    console.error('Seed failed:', error);
    throw error;
  } finally {
    // Always re-enable foreign keys and close connection
    db.pragma('foreign_keys = ON');
    db.close();
  }
}

function getFutureDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

function getPastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// Run the seed
try {
  seed();
} catch (err) {
  // Error already logged in seed() - just exit with failure code
  process.exit(1);
}
