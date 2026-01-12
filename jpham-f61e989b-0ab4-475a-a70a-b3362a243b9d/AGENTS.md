# Agents Guide

## Project Overview

Secure task management system with RBAC. Nx monorepo with Angular 21 frontend
and NestJS 11 backend. TypeORM with SQLite by default (PostgreSQL supported).
JWT auth via Passport with access/refresh token rotation.

## Architecture

```text
apps/
  api/           # NestJS backend - REST API with RBAC, audit logging
  dashboard/     # Angular frontend - Task Management UI
  api-e2e/       # API integration tests (Jest)
  dashboard-e2e/ # E2E tests (Playwright)
libs/
  auth/          # RBAC logic, guards, decorators
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
  - organizationId: FK -> Organizations
  - refreshTokenHash: string | null
  - failedLoginAttempts: number
  - lockoutUntil: Date | null
  - createdAt, updatedAt: timestamps

OrganizationMemberships
  - id: UUID
  - userId: FK -> Users
  - organizationId: FK -> Organizations
  - role: Owner | Admin | Viewer
  - createdAt, updatedAt: timestamps

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

AuditLog
  - id: UUID
  - action: string
  - resource: string
  - resourceId: UUID | null
  - userId: UUID | null
  - organizationId: UUID | null
  - ipAddress: string | null
  - userAgent: string | null
  - metadata: JSON | null
  - createdAt: timestamp
```

## Role Hierarchy & Permissions

```text
Owner
  └── Full CRUD on all org resources
  └── View audit logs
  └── Manage users in org

Admin
  └── CRUD tasks in own org
  └── View audit logs
  └── Read-only users

Viewer
  └── Read tasks in own org only
```

Access scoping rules:

- Users see only their organization's tasks
- Parent org users can see child org tasks
- Task mutations require ownership OR admin/owner role

## API Endpoints

```text
POST   /auth/login          # Returns access token
                           # Refresh token in httpOnly cookie
POST   /auth/register       # Create org + user
POST   /auth/logout         # Clears refresh token
POST   /auth/refresh        # Rotate refresh token and return access token

GET    /tasks               # List accessible tasks (scoped)
POST   /tasks               # Create task
PUT    /tasks/:id           # Update task
DELETE /tasks/:id           # Delete task

GET    /audit-log           # Owner/Admin only
```

## Tech Stack Commands

```bash
# Development
npx nx serve api          # API at localhost:3000
npx nx serve dashboard    # Dashboard at localhost:4200

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

export type UserRole = 'owner' | 'admin' | 'viewer';

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
}
```

### libs/auth - RBAC Logic

```typescript
// libs/auth/src/lib/decorators/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// libs/auth/src/lib/decorators/permissions.decorator.ts
export const RequirePermission = (action: Action, resource: Resource) =>
  SetMetadata('permission', { action, resource });
```

### NestJS Backend (apps/api)

```typescript
// Global guards/interceptor: ThrottlerGuard, JwtAuthGuard, CsrfGuard,
// RolesGuard, AuditInterceptor
// Controllers: thin, delegate to services
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: IUser) {
    return this.tasksService.findAccessible(user);
  }

  @Post()
  @Roles('owner', 'admin')
  create(@CurrentUser() user: IUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }
}
```

### Angular Frontend (apps/dashboard)

```typescript
// Smart container component
@Component({
  selector: 'app-tasks-page',
  template: `
    <app-task-filters (filter)="store.setFilter($event)" />
    <app-task-board
      [tasks]="store.filteredTasks()"
      [loading]="store.loading()"
      (reorder)="store.reorder($event)"
      (statusChange)="store.updateStatus($event)"
      (delete)="store.delete($event)"
    />
  `,
})
export class TasksPageComponent {
  store = inject(TasksStore);

  constructor() {
    this.store.load();
  }
}
```

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
      guards/jwt-auth.guard.ts
      guards/jwt-refresh.guard.ts
      guards/csrf.guard.ts
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
      organizations.service.ts
      organizations.module.ts
      entities/organization.entity.ts
      entities/organization-membership.entity.ts
    audit/
      audit.service.ts
      audit.module.ts
      audit.interceptor.ts
      entities/audit-log.entity.ts

apps/dashboard/src/
  main.ts
  app/
    app.ts
    app.routes.ts
    app.config.ts
    core/
      interceptors/auth.interceptor.ts
      guards/auth.guard.ts
    features/
      auth/
        login.component.ts
        auth.service.ts
      tasks/
        tasks-page.component.ts
        components/
          task-board.component.ts
          task-card.component.ts
          task-filters.component.ts
          task-form.component.ts
        stores/tasks.store.ts
        services/tasks-api.service.ts
    shared/
      components/
        button.component.ts
        modal.component.ts

libs/data/src/
  index.ts
  lib/
    interfaces/
      user.interface.ts
      task.interface.ts
      organization.interface.ts
    dto/
      create-task.dto.ts
      update-task.dto.ts
      login.dto.ts
    enums/
      role.enum.ts
      task-status.enum.ts

libs/auth/src/
  index.ts
  lib/
    decorators/
      roles.decorator.ts
      current-user.decorator.ts
      public.decorator.ts
    guards/
      roles.guard.ts (for backend import)
    utils/
      token.utils.ts
```

## Testing Strategy

```typescript
// Backend: Test RBAC logic
describe('TasksService', () => {
  it('returns only tasks from user org', async () => {
    const user = { id: '1', organizationId: 'org-1', role: 'viewer' };
    const tasks = await service.findAccessible(user);
    expect(tasks.every(t => t.organizationId === 'org-1')).toBe(true);
  });

  it('prevents viewer from creating tasks', async () => {
    const viewer = { id: '1', role: 'viewer' };
    await expect(service.create(viewer, {}))
      .rejects.toThrow(ForbiddenException);
  });
});

// Frontend: Test store logic
describe('TasksStore', () => {
  it('filters tasks by status', () => {
    const store = new TasksStore();
    store.setState({
      tasks: [{ status: 'todo' }, { status: 'done' }],
      filter: 'todo',
    });
    expect(store.filteredTasks()).toHaveLength(1);
  });
});
```

## Environment Variables

```bash
# apps/api/.env (do not commit)
DATABASE_TYPE=sqlite            # sqlite (default) or postgres
DATABASE_HOST=localhost         
DATABASE_PORT=5432              
DATABASE_NAME=taskdb            
DATABASE_USER=postgres          
DATABASE_PASSWORD=yourpassword  

JWT_ACCESS_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:4200
NODE_ENV=development
```

## Common Mistakes to Avoid

1. **Checking permissions in controllers**: Put RBAC logic in services
2. **Returning all fields**: Use DTOs to strip sensitive data
3. **Hardcoding roles**: Use enums from libs/data
4. **Missing audit logs**: Log all mutations via AuditService
5. **Client-side only validation**: Always validate server-side
6. **Exposing stack traces**: Use exception filters
