# Secure Task Management System

A full-stack task management application with Role-Based Access Control (RBAC), built with NX monorepo architecture.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Setup Instructions](#setup-instructions)
- [Data Model](#data-model)
- [Access Control](#access-control)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Future Considerations](#future-considerations)

---

## Tech Stack

| Layer        | Technologies                                          |
|--------------|-------------------------------------------------------|
| **Backend**  | NestJS 11, TypeORM, Passport.js (JWT), class-validator |
| **Frontend** | Angular 21, NgRx Signals, TailwindCSS, Angular CDK    |
| **Shared**   | NX Monorepo, TypeScript                               |

---

## Architecture Overview

### Why NX Monorepo?

1. **Code Sharing** - Shared types in `libs/` ensure frontend/backend consistency
2. **Dependency Graph** - Only rebuilds affected code
3. **Consistent Tooling** - Unified `nx serve/test/build` commands
4. **Scalability** - Easy to add new apps sharing the same libraries

### Project Structure

```
apps/
├── api/                 # NestJS REST API
├── dashboard/           # Angular SPA
├── api-e2e/             # Jest integration tests
└── dashboard-e2e/       # Playwright E2E tests

libs/
├── data/                # Shared interfaces, DTOs, enums
└── auth/                # Shared decorators, guards, JWT utilities
```

### Shared Libraries

**`libs/data`** - Types shared across apps:
- `UserRole`, `TaskStatus`, `TaskPriority`, `AuditAction` enums
- `IUser`, `ITask`, `IOrganization`, `IAuditLog` interfaces
- Shared DTOs and test fixtures

**`libs/auth`** - Auth utilities:
- `@Roles()`, `@CurrentUser()`, `@Public()` decorators
- `RolesGuard` for role enforcement
- `JwtPayload` interface and normalization helpers

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL (production) or SQLite (development)

### Installation

```bash
git clone <repository-url>
cd jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d
npm install
```

### Environment Variables

Create `apps/api/.env`:

| Variable                  | Required | Description                       |
|---------------------------|:--------:|-----------------------------------|
| `JWT_ACCESS_SECRET`       |   Yes    | Min 32 chars, for access tokens   |
| `JWT_REFRESH_SECRET`      |   Yes    | Min 32 chars, for refresh tokens  |
| `JWT_ACCESS_EXPIRES_IN`   |    No    | Default: `15m`                    |
| `JWT_REFRESH_EXPIRES_IN`  |    No    | Default: `7d`                     |
| `DATABASE_TYPE`           |    No    | `sqlite` (default) or `postgres`  |
| `DATABASE_PATH`           |  SQLite  | Path to SQLite file               |
| `DATABASE_HOST`           | Postgres | PostgreSQL host                   |
| `DATABASE_PORT`           | Postgres | PostgreSQL port                   |
| `DATABASE_NAME`           | Postgres | PostgreSQL database name          |
| `DATABASE_USER`           | Postgres | PostgreSQL username               |
| `DATABASE_PASSWORD`       | Postgres | PostgreSQL password               |
| `NODE_ENV`                |    No    | `development` or `production`     |
| `COOKIE_DOMAIN`           |    No    | For subdomain cookie sharing      |

Generate secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Seed Database (Optional)

```bash
node scripts/seed.js
```

Creates demo accounts: `owner@demo.com`, `admin@demo.com`, `viewer@demo.com` (password: `Demo@123`)

### Running

```bash
npx nx serve api           # Backend: http://localhost:3000
npx nx serve dashboard     # Frontend: http://localhost:4200
npx nx run-many -t serve   # Both in parallel
```

### Testing

```bash
npx nx test api            # Unit tests
npx nx e2e api-e2e         # Integration tests
npx nx lint api            # Linting
```

---

## Data Model

### Entity Relationship Diagram

```
┌──────────────────────────┐          ┌──────────────────────────┐
│       ORGANIZATIONS      │          │          USERS           │
├──────────────────────────┤          ├──────────────────────────┤
│ id            UUID    PK │◄─────────│ id            UUID    PK │
│ name          VARCHAR    │          │ email         VARCHAR UK │
│ slug          VARCHAR UK │          │ password      VARCHAR    │
│ description   TEXT       │          │ role          ENUM       │
│ parentId      UUID    FK │──┐       │ organizationId UUID   FK │───►
│ isActive      BOOLEAN    │  │       │ refreshTokenHash VARCHAR │
│ createdAt     TIMESTAMP  │  │       │ failedAttempts INT       │
│ updatedAt     TIMESTAMP  │  │       │ lockoutUntil  TIMESTAMP  │
└──────────────────────────┘  │       └──────────────────────────┘
              ▲               │
              └───────────────┘
            (self-reference)

┌──────────────────────────┐          ┌──────────────────────────┐
│   ORG_MEMBERSHIPS        │          │       AUDIT_LOGS         │
├──────────────────────────┤          ├──────────────────────────┤
│ id            UUID    PK │          │ id            UUID    PK │
│ userId        UUID    FK │───►      │ action        ENUM       │
│ organizationId UUID   FK │───►      │ resource      VARCHAR    │
│ role          ENUM       │          │ resourceId    UUID       │
│ createdAt     TIMESTAMP  │          │ userId        UUID    FK │───►
│ updatedAt     TIMESTAMP  │          │ organizationId UUID   FK │───►
└──────────────────────────┘          │ ipAddress     VARCHAR    │
   (unique: userId + orgId)           │ userAgent     TEXT       │
                                      │ metadata      JSON       │
┌──────────────────────────┐          │ createdAt     TIMESTAMP  │
│          TASKS           │          └──────────────────────────┘
├──────────────────────────┤
│ id            UUID    PK │
│ title         VARCHAR    │          ┌──────────────────────────┐
│ description   TEXT       │          │        ENUM VALUES       │
│ status        ENUM       │          ├──────────────────────────┤
│ priority      ENUM       │          │ UserRole:   owner        │
│ category      ENUM       │          │             admin        │
│ dueDate       TIMESTAMP  │          │             viewer       │
│ position      INT        │          ├──────────────────────────┤
│ organizationId UUID   FK │───►      │ TaskStatus: todo         │
│ createdById   UUID    FK │───►      │             in_progress  │
│ assigneeId    UUID    FK │───►      │             review, done │
│ createdAt     TIMESTAMP  │          ├──────────────────────────┤
│ updatedAt     TIMESTAMP  │          │ AuditAction: create,read │
└──────────────────────────┘          │   update,delete,login    │
                                      │   logout,register...     │
                                      └──────────────────────────┘
```

### Key Design Decisions

- **Organizations** support 2-level hierarchy via self-referential `parentId`
- **OrganizationMemberships** allows users to have different roles in different orgs
- **Tasks** use `position` field for drag-drop ordering (indexed for Kanban queries)
- **AuditLogs** are append-only with client info for security forensics
- **Users** have account lockout (5 failed attempts → 15-min lockout)

---

## Access Control

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  OWNER (Level 3)                                                │
│  └── Full organization control, can change member roles         │
│       │                                                         │
│       ▼                                                         │
│  ADMIN (Level 2)                                                │
│  └── Manage tasks & members, view audit logs                    │
│       │                                                         │
│       ▼                                                         │
│  VIEWER (Level 1)                                               │
│  └── Read-only access to tasks                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Action                      | Owner | Admin  | Viewer  |
|-----------------------------|:-----:|:-----: |:------: |
| View tasks                  |  ✅   |  ✅   |   ✅   |
| Create/Edit/Delete tasks    |  ✅   |  ✅   |   ❌   |
| Add/Remove members          |  ✅   |  ✅   |   ❌   |
| **Change member roles**     |  ✅   |  ❌   |   ❌   |
| View audit logs             |  ✅   |  ✅   |   ❌   |

> **Security:** Only Owners can change roles, preventing privilege escalation.

### Organization Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│  PARENT ORGANIZATION                                            │
│  ├── Owner A    ───► Can view: Parent + Child org data          │
│  └── Admin B    ───► Can view: Parent + Child org data          │
│       │                                                         │
│       └──► CHILD ORGANIZATION                                   │
│            ├── Admin C   ───► Can view: Child org data ONLY     │
│            └── Viewer D  ───► Can view: Child org data ONLY     │
└─────────────────────────────────────────────────────────────────┘
          ▼ Downward visibility    ✗ No upward access
```

**Access Rules:**
- All mutations require membership + minimum `admin` role

### JWT + RBAC Flow

```
┌──────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│  Client  │───►│ JwtAuthGuard │───►│ RolesGuard │───►│ Service  │
└──────────┘    │ (signature)  │    │ (@Roles)   │    │ (membership)
                └──────────────┘    └────────────┘    └──────────┘
```

JWT payload: `{ sub: userId, oid: orgId, r: role }` (minimized, no PII)

---

## API Documentation

### Authentication

| Endpoint           | Method |  Description                               |
|--------------------|:------:|--------------------------------------------|
| `/auth/register`   |  POST  | Create user + organization (becomes owner) |
| `/auth/login`      |  POST  | Returns access token, sets refresh cookie  |
| `/auth/refresh`    |  POST  | Rotate tokens using httpOnly cookie        |
| `/auth/logout`     |  POST  | Invalidate refresh token                   |

**Login Request/Response:**
```json
// Request
{ "email": "user@example.com", "password": "SecureP@ss123" }

// Response
{ "accessToken": "eyJ...", "expiresIn": 900, "user": { "id": "...", "role": "owner" } }
```

### Tasks

| Endpoint                              | Method |  Role   | Description                      |
|---------------------------------------|:------:|:-------:|----------------------------------|
| `/organizations/:orgId/tasks`         |  GET   |   Any   | List tasks (paginated, filterable) |
| `/organizations/:orgId/tasks`         |  POST  | Admin+  | Create task                      |
| `/organizations/:orgId/tasks/:id`     |  PUT   | Admin+  | Update task                      |
| `/organizations/:orgId/tasks/:id`     | DELETE | Admin+  | Delete task                      |
| `/organizations/:orgId/tasks/:id/reorder` | PUT | Admin+  | Change position                  |

**Query params:** `status`, `category`, `assigneeId`, `page`, `limit`

### Organizations

| Endpoint                              | Method |  Role   | Description        |
|---------------------------------------|:------:|:-------:|--------------------|
| `/organizations`                      |  POST  |   Any   | Create organization|
| `/organizations/:id`                  |  GET   | Member  | Get details        |
| `/organizations/:id/members`          |  GET   | Member  | List members       |
| `/organizations/:id/members`          |  POST  | Admin+  | Add member         |
| `/organizations/:id/members/:userId/role` | PUT |  Owner | Change role        |
| `/organizations/:id/members/:userId`  | DELETE | Admin+  | Remove member      |

### Audit Logs

| Endpoint                         | Method |  Role   | Description                        |
|----------------------------------|:------:|:-------:|------------------------------------|
| `/audit-logs`                    |  GET   | Admin+  | List logs (paginated, filterable)  |
| `/audit-logs/me`                 |  GET   |   Any   | Own logs                           |
| `/audit-logs/user/:userId`       |  GET   | Admin+  | User's logs                        |
| `/audit-logs/organization/:orgId`|  GET   | Admin+  | Org logs                           |

**Query params:** `action`, `resource`, `startDate`, `endDate`, `page`, `limit`

---

## Security

### Implemented Features

| Feature            | Implementation                                    |
|--------------------|---------------------------------------------------|
| Password hashing   | bcrypt (10 rounds)                                |
| JWT tokens         | Separate secrets, 15m access / 7d refresh         |
| Refresh tokens     | httpOnly cookie, bcrypt-hashed storage, rotation  |
| Account lockout    | 5 failed attempts → 15-minute lockout             |
| Timing attacks     | Constant-time password comparison                 |
| Input validation   | class-validator on all DTOs                       |
| SQL injection      | TypeORM parameterized queries                     |
| XSS                | Angular built-in sanitization                     |

### Refresh Token Cookie

```
httpOnly: true, secure: true (prod), sameSite: 'strict', path: '/api/auth'
```

---

## Future Considerations

### Advanced Role Delegation

- **Custom Roles** - Organization-defined roles with granular permissions
- **Resource-Level Permissions** - Per-task or per-category access
- **Delegation Chains** - Admins delegate specific permissions without full role promotion

### Production Enhancements

| Area             | Enhancement                              |
|------------------|------------------------------------------|
| Token security   | Token family tracking for theft detection|
| Rate limiting    | Redis-backed sliding window              |
| Audit logging    | Async queue (Bull/BullMQ)                |
| Brute force      | CAPTCHA + progressive delays             |
| Headers          | CSP, HSTS, X-Frame-Options               |

### RBAC Caching

- Cache memberships in Redis (5-min TTL)
- Invalidate on role changes
- Denormalize roles into JWT (already implemented)
- Use PostgreSQL Row-Level Security for scaling

---

## Keyboard Shortcuts

| Shortcut           | Action           |
|--------------------|------------------|
| `Alt + D`          | Toggle dark mode |
| `Alt + H`          | Dashboard        |
| `Alt + T`          | Task board       |
| `Alt + Shift + A`  | Audit logs       |
| `Shift + ?`        | Show help        |

---

## License

MIT
