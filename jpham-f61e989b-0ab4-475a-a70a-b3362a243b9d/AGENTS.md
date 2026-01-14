# Agents Guide

## Project Overview

Secure task management system with RBAC. Nx monorepo with Angular 21 (standalone
components, NgRx Signals, Tailwind v4 + Angular Material) frontend and NestJS
11 backend. TypeORM uses SQLite by default (data/taskdb.sqlite) with PostgreSQL
for production. JWT auth uses access tokens plus refresh token rotation in an
httpOnly cookie; CSRF guard enforces Origin + X-Requested-With. API is served
under /api with Swagger at /docs in dev.

## Architecture

```text
apps/
  api/           # NestJS backend - org-scoped REST API with audit logging
  dashboard/     # Angular frontend - standalone components, NgRx Signals, Tailwind + Material
  api-e2e/       # API integration tests (Jest)
  dashboard-e2e/ # E2E tests (Playwright)
libs/
  auth/          # Auth decorators, RolesGuard, JWT payload helpers, CASL abilities
  data/          # Shared interfaces, DTOs, enums
```

## Design Principles

Follow these principles in order of priority:

### KISS - Keep It Simple
- Write the simplest code that works
- Avoid clever solutions; prefer readable ones
- One file, one purpose
- If explaining takes longer than the code, simplify

### YAGNI - You Aren't Gonna Need It
- Only implement what's requested now
- No speculative features or "future-proofing"
- Delete unused code immediately
- No empty interfaces or extension points "just in case"

### DRY - Don't Repeat Yourself
- Extract to `libs/` only when code is used in both `api/` and `dashboard/`
- Prefer duplication over wrong abstraction
- Three occurrences minimum before extracting

### SOLID
- **S**: One class/function = one responsibility
- **O**: Extend behavior through composition, not modification
- **L**: Subtypes must honor parent contracts
- **I**: Small, focused interfaces over large ones
- **D**: Depend on abstractions in `libs/`, implementations in `apps/`

### TDA - Tell, Don't Ask
- Objects should expose behavior, not data
- Avoid getter chains: `user.getOrg().getRole().canEdit()`
- Commands over queries: `task.markComplete()` not `task.status = 'complete'`

## Data Models

```text
Users
  - id: UUID
  - email: string (unique)
  - password: string (hashed)
  - role: Owner | Admin | Viewer
  - organizationId: FK -> Organizations (required, "primary" org for UI defaults)
  - refreshTokenHash: string | null
  - failedLoginAttempts: number
  - lockoutUntil: Date | null
  - createdAt, updatedAt: timestamps

OrganizationMemberships (AUTHORITATIVE for org access)
  - id: UUID
  - userId: FK -> Users
  - organizationId: FK -> Organizations
  - role: Owner | Admin | Viewer
  - createdAt, updatedAt: timestamps

**Users.organizationId vs OrganizationMemberships:**
- `Users.organizationId` is the user's "primary" org (required). Use for:
  - UI defaults (e.g., pre-selecting org in dropdowns)
  - Billing/primary-org workflows
  - Set automatically when user is created via registration
- `OrganizationMemberships` is the AUTHORITATIVE source for all org access. Use for:
  - Authorization checks (always query memberships for RBAC)
  - Listing all orgs a user can access
  - Determining role within a specific organization

**Synchronization strategy:**
- On registration: `Users.organizationId` is set to the created org (always required)
- On membership delete: If deleted membership was the primary org, reassign `Users.organizationId` to another valid membership
- On membership update: If role indicates primary (e.g., owner), optionally update `Users.organizationId`
- Periodic reconciliation: Verify `Users.organizationId` references a valid membership

Organizations (hierarchy)
  - id: UUID
  - name: string
  - slug: string (unique)
  - description: string | null
  - parentId: FK -> Organizations (nullable)
  - isActive: boolean
  - createdAt, updatedAt: timestamps

Tasks
  - id: UUID
  - title: string
  - description: string | null
  - status: 'todo' | 'in_progress' | 'review' | 'done'
  - priority: 'low' | 'medium' | 'high' | 'urgent'
  - category: 'work' | 'personal' | 'shopping' | 'health' | 'other'
  - dueDate: Date | null
  - position: number (for ordering)
  - organizationId: FK -> Organizations
  - createdById: FK -> Users
  - assigneeId: FK -> Users (nullable)
  - createdAt, updatedAt: timestamps
  - createdBy?: User (optional relation)
  - assignee?: User (optional relation)

AuditLog
  - id: UUID
  - action: AuditAction
  - resource: string
  - resourceId: UUID | null
  - userId: UUID | null
  - organizationId: UUID | null
  - ipAddress: string | null
  - userAgent: string | null
  - metadata: Record<string, unknown> | null
  - createdAt: timestamp
  - user?: User (optional relation)
```

## Role Hierarchy & Permissions

```text
Owner
  └── Full CRUD on org resources
  └── Add/remove members + change member roles
  └── View audit logs

Admin
  └── Create/update/delete tasks in org
  └── Add/remove members (cannot change roles)
  └── View audit logs

Viewer
  └── Read tasks in org
  └── Update tasks they created or are assigned to (service-level check)
```

Access scoping rules:

- OrganizationMembership is authoritative for org access (user.organizationId is the primary org only)
- Membership is required for org resources; no implicit parent/child access
- Task create/delete requires admin/owner; updates allow admin/owner or creator/assignee
- Task reorder endpoint currently checks membership only (UI limits to admin/owner)

## API Endpoints

```text
All endpoints are prefixed with /api.

POST   /auth/login                             # Returns access token; refresh token in httpOnly cookie
POST   /auth/register                          # Create org + user
POST   /auth/logout                            # Clears refresh token cookie
POST   /auth/refresh                           # Rotate refresh token and return access token

POST   /organizations                          # Create organization
GET    /organizations/:id                      # Organization details (membership required)
GET    /organizations/:id/members              # List organization members
POST   /organizations/:id/members              # Add member (Admin+)
PUT    /organizations/:id/members/:userId/role # Change member role (Owner only)
DELETE /organizations/:id/members/:userId      # Remove member (Admin+)
GET    /organizations/user/memberships         # Current user's org memberships

GET    /organizations/:orgId/tasks             # List tasks (filters + pagination)
GET    /organizations/:orgId/tasks/:id         # Get task
POST   /organizations/:orgId/tasks             # Create task (Admin+)
PUT    /organizations/:orgId/tasks/:id         # Update task
DELETE /organizations/:orgId/tasks/:id         # Delete task (Admin+)
PUT    /organizations/:orgId/tasks/:id/reorder # Reorder task

GET    /audit-logs                             # Admin+ audit logs (filters + pagination)
GET    /audit-logs/organization/:orgId         # Admin+ audit logs for org
GET    /audit-logs/user/:userId                # Admin+ or own logs (orgId required for other users)
GET    /audit-logs/me                          # Current user's audit logs
```

## Tech Stack Commands

```bash
# Development
npx nx serve api          # API at localhost:3000
npx nx serve dashboard    # Dashboard at localhost:4200

# Seed (SQLite)
npx ts-node scripts/seed.ts

# Build
npx nx build api
npx nx build dashboard

# Test
npx nx test api
npx nx test dashboard
npx nx e2e api-e2e
npx nx e2e dashboard-e2e

# Lint
npx nx lint api
npx nx lint dashboard

# Generate
npx nx g @nx/nest:resource tasks --project=api
npx nx g @nx/angular:component task-list --project=dashboard
```

## Code Conventions

### libs/data - Shared Types

```typescript
// libs/data/src/lib/interfaces/user.interface.ts
export interface IUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// libs/data/src/lib/interfaces/task.interface.ts
export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: Date | null;
  position: number;
  organizationId: string;
  createdById: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: IUser;
  assignee?: IUser;
}
```

DTOs are interfaces in `libs/data`; validation classes live in
`apps/api/src/common/dto/validation.dto.ts` and are used with `ValidationPipe`.

### libs/auth - RBAC Logic

```typescript
// libs/auth/src/lib/decorators/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// libs/auth/src/lib/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

JWT payloads are minimized (`oid` for organization, `r` for role) and normalized
in `libs/auth/src/lib/utils/jwt-payload.interface.ts`.

### NestJS Backend (apps/api)

```typescript
// Global guards/interceptor: ThrottlerGuard, JwtAuthGuard, CsrfGuard,
// RolesGuard, AuditInterceptor (set in AppModule)
// Controllers: thin, delegate to services
@Controller('organizations/:orgId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.create(orgId, dto, user);
  }

  @Put(':id')
  update(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.update(id, dto, user, orgId);
  }
}
```

### Angular Frontend (apps/dashboard)

```typescript
// Standalone feature component
@Component({
  selector: 'app-task-board',
  standalone: true,
})
export class TaskBoardComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly tasksStore = inject(TasksStore);

  ngOnInit() {
    const organizationId = this.authStore.organizationId();
    if (organizationId) {
      this.tasksStore.loadTasks({ organizationId });
    }
  }
}
```

All HTTP calls go through `auth.interceptor.ts` to add `X-Requested-With`,
`withCredentials`, and handle refresh token rotation on 401 responses.

## File Structure

```text
apps/api/src/
  main.ts
  app/
    app.module.ts
    auth/
      auth.controller.ts
      auth.service.ts
      auth.module.ts
      strategies/jwt.strategy.ts
      strategies/jwt-refresh.strategy.ts
      guards/jwt-auth.guard.ts
      guards/jwt-refresh.guard.ts
      guards/csrf.guard.ts
      guards/local-auth.guard.ts
    tasks/
      tasks.controller.ts
      tasks.service.ts
      tasks.module.ts
      entities/task.entity.ts
    users/
      users.service.ts
      users.module.ts
      entities/user.entity.ts
    organizations/
      organizations.controller.ts
      organizations.service.ts
      organizations.module.ts
      entities/organization.entity.ts
      entities/organization-membership.entity.ts
    audit/
      audit.controller.ts
      audit.service.ts
      audit.module.ts
      audit.interceptor.ts
      entities/audit-log.entity.ts
    common/
      dto/validation.dto.ts

apps/dashboard/src/
  main.ts
  app/
    app.ts
    app.routes.ts
    app.config.ts
    core/
      interceptors/auth.interceptor.ts
      guards/auth.guard.ts
      guards/role.guard.ts
      services/auth.service.ts
      services/tasks.service.ts
      services/audit.service.ts
      services/keyboard-shortcuts.service.ts
      services/theme.service.ts
    features/
      auth/
        login/
        register/
      dashboard/
        dashboard.component.ts
      tasks/
        task-board/
        task-card/
        task-form/
      audit/
        audit-log/
    store/
      auth/
      tasks/
    shared/
      components/
        header/
        task-stats/
        keyboard-shortcuts-dialog/

libs/data/src/
  index.ts
  lib/
    interfaces/
      user.interface.ts
      task.interface.ts
      organization.interface.ts
      audit-log.interface.ts
    dto/
      create-task.dto.ts
      login.dto.ts
      organization.dto.ts
      pagination.dto.ts
      task-filter.dto.ts
      user.dto.ts
    enums/
      role.enum.ts
      task-status.enum.ts
      audit-action.enum.ts
      permission.enum.ts

libs/auth/src/
  index.ts
  lib/
    abilities/ability.factory.ts
    decorators/
      roles.decorator.ts
      current-user.decorator.ts
      public.decorator.ts
    guards/
      roles.guard.ts (for backend import)
    utils/
      jwt-payload.interface.ts
```

## Testing Strategy

```typescript
// Backend: Test RBAC logic
describe('TasksService', () => {
  it('applies org filter + pagination', async () => {
    const result = await service.findByOrganization('org-1', { status: 'todo' }, 1, 50);
    expect(result.page).toBe(1);
  });

  it('prevents viewer from creating tasks', async () => {
    const viewer = { id: '1', role: 'viewer' };
    await expect(service.create('org-1', { title: 'Test' }, viewer))
      .rejects.toThrow(ForbiddenException);
  });
});

// Frontend: Test store logic
describe('TasksStore', () => {
  it('computes completion rate', async () => {
    tasksServiceMock.getTasks.mockReturnValue(of([
      { status: 'done' } as ITask,
      { status: 'todo' } as ITask,
    ]));
    store.loadTasks({ organizationId: 'org-1' });
    await flush();
    expect(store.completionRate()).toBe(50);
  });
});
```

API integration tests live in `apps/api-e2e`; dashboard e2e tests use Playwright
in `apps/dashboard-e2e`.

## Environment Variables

```bash
# apps/api/.env (do not commit)
DATABASE_TYPE=sqlite            # sqlite (default) or postgres
DATABASE_HOST=localhost         
DATABASE_PORT=5432              
DATABASE_NAME=taskdb            
DATABASE_USER=postgres          
DATABASE_PASSWORD=yourpassword  

JWT_ACCESS_SECRET=your-256-bit-secret   # >=32 chars, at least 10 unique chars
JWT_REFRESH_SECRET=your-256-bit-secret  # >=32 chars, at least 10 unique chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:4200     # used for CORS + CSRF origin checks
NODE_ENV=development
COOKIE_DOMAIN=yourdomain.com           # optional, production only
```

## Common Mistakes to Avoid

1. **Missing CSRF headers/credentials**: `X-Requested-With` + `withCredentials` are required for non-GET requests.
2. **Calling the wrong endpoints**: Task routes are under `/api/organizations/:orgId/tasks`, not `/tasks`.
3. **Client-only validation or RBAC**: Keep `ValidationPipe`/`validation.dto.ts` and service-level checks; use `@Roles` for coarse gating.
4. **Returning sensitive fields**: Strip `password`, `refreshTokenHash`, and lockout fields from responses.
5. **Hardcoding roles**: Use `UserRole` and `hasMinimumRole` from `libs/data`.
6. **Skipping audit logs**: Log mutations/auth events via `AuditService`/`AuditInterceptor`.
