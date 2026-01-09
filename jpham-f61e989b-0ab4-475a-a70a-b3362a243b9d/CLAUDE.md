# Claude Code Guidelines

## Project Overview

Secure Task Management System with Role-Based Access Control (RBAC). Nx monorepo with Angular 21 frontend and NestJS 11 backend. PostgreSQL database with TypeORM. JWT authentication via Passport.

## Architecture

```
apps/
  api/           # NestJS backend - REST API with RBAC
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

```
Users
  - id: UUID
  - email: string (unique)
  - password: string (hashed)
  - organizationId: FK -> Organizations
  - roleId: FK -> Roles

Organizations (2-level hierarchy)
  - id: UUID
  - name: string
  - parentId: FK -> Organizations (nullable, for child orgs)

Roles: Owner | Admin | Viewer
  - id: UUID
  - name: string
  - permissions: Permission[]

Permissions
  - id: UUID
  - action: 'create' | 'read' | 'update' | 'delete'
  - resource: 'task' | 'user' | 'audit-log'

Tasks
  - id: UUID
  - title: string
  - description: string
  - status: 'todo' | 'in-progress' | 'done'
  - category: 'work' | 'personal'
  - order: number (for drag-drop)
  - ownerId: FK -> Users
  - organizationId: FK -> Organizations
  - createdAt, updatedAt: timestamps

AuditLog
  - id: UUID
  - userId: FK -> Users
  - action: string
  - resource: string
  - resourceId: UUID
  - timestamp: Date
  - details: JSON
```

## Role Hierarchy & Permissions

```
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

```
POST   /auth/login          # Returns JWT
POST   /auth/register       # Create user

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
}

export type UserRole = 'owner' | 'admin' | 'viewer';

// libs/data/src/lib/dto/create-task.dto.ts
export class CreateTaskDto {
  title: string;
  description?: string;
  category: TaskCategory;
}

export type TaskCategory = 'work' | 'personal';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
```

### libs/auth - RBAC Logic

```typescript
// libs/auth/src/lib/decorators/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

// libs/auth/src/lib/decorators/permissions.decorator.ts
export const RequirePermission = (action: Action, resource: Resource) =>
  SetMetadata('permission', { action, resource });

// libs/auth/src/lib/abilities/ability.factory.ts
export function defineAbilitiesFor(user: IUser) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.role === 'owner') {
    can('manage', 'all');
  } else if (user.role === 'admin') {
    can(['create', 'read', 'update', 'delete'], 'Task');
    can('read', 'AuditLog');
  } else {
    can('read', 'Task');
  }

  return build();
}
```

### NestJS Backend (apps/api)

```typescript
// Guards: thin, use libs/auth
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!roles) return true;
    const request = context.switchToHttp().getRequest();
    return roles.includes(request.user.role);
  }
}

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

// Services: business logic, enforce RBAC
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private repo: Repository<Task>,
    private auditService: AuditService,
  ) {}

  async findAccessible(user: IUser): Promise<Task[]> {
    const orgIds = await this.getAccessibleOrgIds(user);
    return this.repo.find({ where: { organizationId: In(orgIds) } });
  }

  async create(user: IUser, dto: CreateTaskDto): Promise<Task> {
    const task = this.repo.create({
      ...dto,
      ownerId: user.id,
      organizationId: user.organizationId,
    });
    const saved = await this.repo.save(task);
    await this.auditService.log(user, 'create', 'task', saved.id);
    return saved;
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

// Dumb presentation component
@Component({
  selector: 'app-task-card',
  template: `
    <div class="p-4 bg-white rounded-lg shadow" [class.opacity-50]="task().status === 'done'">
      <h3>{{ task().title }}</h3>
      <span class="badge">{{ task().category }}</span>
    </div>
  `,
})
export class TaskCardComponent {
  task = input.required<ITask>();
}

// State with NgRx Signals
export const TasksStore = signalStore(
  withState<TasksState>({ tasks: [], filter: 'all', loading: false }),
  withComputed((state) => ({
    filteredTasks: computed(() =>
      state.filter() === 'all'
        ? state.tasks()
        : state.tasks().filter(t => t.status === state.filter())
    ),
  })),
  withMethods((store, api = inject(TasksApiService)) => ({
    async load() {
      patchState(store, { loading: true });
      const tasks = await api.getAll();
      patchState(store, { tasks, loading: false });
    },
    async reorder(event: CdkDragDrop<ITask[]>) {
      const tasks = [...store.tasks()];
      moveItemInArray(tasks, event.previousIndex, event.currentIndex);
      patchState(store, { tasks });
      await api.reorder(tasks.map((t, i) => ({ id: t.id, order: i })));
    },
  })),
);
```

## File Structure

```
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
      entities/organization.entity.ts
    audit/
      audit.service.ts
      audit.module.ts
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
    abilities/
      ability.factory.ts
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

  it('allows owner to delete any task in org', async () => {
    const owner = { id: '1', organizationId: 'org-1', role: 'owner' };
    const task = { id: 't1', organizationId: 'org-1', ownerId: '2' };
    await expect(service.delete(owner, task.id)).resolves.not.toThrow();
  });

  it('prevents viewer from creating tasks', async () => {
    const viewer = { id: '1', role: 'viewer' };
    await expect(service.create(viewer, {})).rejects.toThrow(ForbiddenException);
  });
});

// Frontend: Test store logic
describe('TasksStore', () => {
  it('filters tasks by status', () => {
    const store = new TasksStore();
    store.setState({ tasks: [{ status: 'todo' }, { status: 'done' }], filter: 'todo' });
    expect(store.filteredTasks()).toHaveLength(1);
  });
});
```

## Environment Variables

```bash
# apps/api/.env (do not commit)
DATABASE_URL=postgresql://user:pass@localhost:5432/taskdb
JWT_SECRET=your-256-bit-secret
JWT_EXPIRATION=1h
```

## Common Mistakes to Avoid

1. **Checking permissions in controllers**: Put RBAC logic in services
2. **Returning all fields**: Use DTOs to strip sensitive data
3. **Hardcoding roles**: Use enums from libs/data
4. **Missing audit logs**: Log all mutations via AuditService
5. **Client-side only validation**: Always validate server-side
6. **Exposing stack traces**: Use exception filters
