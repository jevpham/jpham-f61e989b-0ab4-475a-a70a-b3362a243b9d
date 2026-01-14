# Claude Code Guidelines

## Project Overview

Secure Task Management System with Role-Based Access Control (RBAC). Nx monorepo with Angular 21 frontend and NestJS 11 backend. SQLite/PostgreSQL database with TypeORM. JWT authentication via Passport with refresh tokens. CSRF protection. Comprehensive audit logging with authentication event tracking. Dark mode support with keyboard shortcuts and WCAG accessibility features.

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
  - userId: FK -> Users (nullable for system events)
  - action: AuditAction (create|read|update|delete|login|login_failed|logout|register|access_denied|status_change|reorder)
  - resource: string (tasks|organizations|auth)
  - resourceId: UUID (nullable)
  - organizationId: FK -> Organizations (nullable)
  - ipAddress: string (nullable)
  - userAgent: string (nullable)
  - metadata: JSON (nullable, auth state, error details)
  - createdAt: timestamp
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
POST   /auth/login           # Returns JWT + refresh token
POST   /auth/register        # Create user
POST   /auth/refresh         # Refresh access token
POST   /auth/logout          # Invalidate session

GET    /tasks                # List accessible tasks (scoped)
POST   /tasks                # Create task
PUT    /tasks/:id            # Update task
DELETE /tasks/:id            # Delete task

GET    /audit-logs           # List audit logs (Admin+, validated query params)
GET    /audit-logs/me        # Get current user's audit logs
GET    /audit-logs/user/:id  # Get specific user's logs (Admin+)
GET    /audit-logs/organization/:id  # Get org logs (Admin+)
```

### Audit Log Query Parameters
- `organizationId` - UUID filter
- `userId` - UUID filter
- `action` - AuditAction enum
- `resource` - tasks|organizations|auth
- `startDate` / `endDate` - ISO 8601 date strings
- `page` (default: 1) / `limit` (default: 50, max: 100)

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

# Database
node scripts/seed.js      # Seed SQLite database with test data
```

## Database Support

The application supports both PostgreSQL and SQLite:
- SQLite uses file-level locking (no pessimistic row locks)
- PostgreSQL/MySQL use `pessimistic_write` for concurrent updates
- Locking strategy is auto-detected via TypeORM driver type

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

// libs/data/src/lib/enums/audit-action.enum.ts
export type AuditAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'login' | 'login_failed' | 'logout' | 'register'
  | 'access_denied' | 'status_change' | 'reorder';
```

### Validation DTOs (Backend)

```typescript
// apps/api/src/audit/dto/audit-log-query.dto.ts
// Use class-validator for query parameter validation
export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  organizationId?: string;

  @IsOptional()
  @IsEnum(['create', 'update', 'delete', 'login', ...])
  action?: AuditAction;

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be ISO 8601 format' })
  startDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
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
// Components use external templates and SCSS files
@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, TaskCardComponent],
  templateUrl: './task-board.component.html',  // External template
  styleUrl: './task-board.component.scss',      // External SCSS
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardComponent {
  // Use Angular signals for inputs
  tasks = input.required<ITask[]>();
  loading = input<boolean>(false);

  // Outputs for parent communication
  reorder = output<CdkDragDrop<ITask[]>>();
  statusChange = output<{ id: string; status: TaskStatus }>();
}

// Presentation component with signal inputs
@Component({
  selector: 'app-task-card',
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  task = input.required<ITask>();
}

// State with NgRx Signal Store
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
  })),
);

// Theme service with signals and system preference detection
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.loadTheme());
  readonly theme = this._theme.asReadonly();
  readonly isDark = signal<boolean>(false);

  toggleDarkMode() {
    const current = this._theme();
    if (current === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._theme.set(systemDark ? 'light' : 'dark');
    } else {
      this._theme.set(current === 'dark' ? 'light' : 'dark');
    }
  }
}
```

## File Structure

```
apps/api/src/
  main.ts
  app/
    app.module.ts
    app.controller.ts
    app.service.ts
  auth/
    auth.controller.ts
    auth.service.ts
    auth.module.ts
    strategies/
      jwt.strategy.ts
      jwt-refresh.strategy.ts
      local.strategy.ts
    guards/
      jwt-auth.guard.ts
      jwt-refresh.guard.ts
      local-auth.guard.ts
      csrf.guard.ts
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
    entities/
      organization.entity.ts
      organization-membership.entity.ts
  audit/
    audit.controller.ts
    audit.service.ts
    audit.module.ts
    audit.interceptor.ts
    entities/audit-log.entity.ts
    dto/audit-log-query.dto.ts
  common/
    dto/validation.dto.ts

apps/dashboard/src/
  main.ts
  app/
    app.ts
    app.routes.ts
    app.config.ts
    core/
      guards/
        auth.guard.ts
        role.guard.ts
      interceptors/auth.interceptor.ts
      services/
        auth.service.ts
        tasks.service.ts
        audit.service.ts
        theme.service.ts
        keyboard-shortcuts.service.ts
    features/
      auth/
        login/
          login.component.ts
          login.component.html
          login.component.scss
        register/
          register.component.ts
          register.component.html
          register.component.scss
        shared/_auth-shared.scss
      tasks/
        task-board/
          task-board.component.ts
          task-board.component.scss
        task-card/
          task-card.component.ts
          task-card.component.scss
        task-form/
          task-form.component.ts
          task-form.component.scss
      dashboard/
        dashboard.component.ts
        dashboard.component.scss
      audit/
        audit-log/
          audit-log.component.ts
          audit-log.component.html
          audit-log.component.scss
    shared/
      components/
        header/header.component.ts
        task-stats/task-stats.component.ts
        keyboard-shortcuts-dialog/keyboard-shortcuts-dialog.component.ts
    store/
      auth/auth.store.ts
      tasks/tasks.store.ts

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
      task-filter.dto.ts
      login.dto.ts
      user.dto.ts
      organization.dto.ts
      pagination.dto.ts
    enums/
      role.enum.ts
      task-status.enum.ts
      permission.enum.ts
      audit-action.enum.ts

libs/auth/src/
  index.ts
  lib/
    decorators/
      roles.decorator.ts
      current-user.decorator.ts
      public.decorator.ts
    abilities/
      ability.factory.ts
    guards/
      roles.guard.ts
    utils/
      jwt-payload.interface.ts
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

## Accessibility & Keyboard Shortcuts

The dashboard implements WCAG accessibility standards:

### Keyboard Shortcuts (Alt modifier to avoid browser conflicts)
- `Alt+D` - Toggle dark mode
- `Alt+H` - Go to dashboard
- `Alt+T` - Go to task board
- `Alt+Shift+A` - Go to audit logs
- `Shift+?` - Show keyboard shortcuts dialog

### Accessibility Features
- ARIA live regions for dynamic content updates
- Focus trap in modal dialogs
- Keyboard navigation for tables and interactive elements
- Form validation with `aria-describedby` error messages
- Reduced motion support via `prefers-reduced-motion` media query
- Minimum font sizes (0.75rem) for readability
- Proper disabled state handling (no `pointer-events: none`)

### Theme Support
- Light/Dark/System theme modes
- CSS variables for consistent theming
- System preference detection and auto-switching

## Common Mistakes to Avoid

1. **Checking permissions in controllers**: Put RBAC logic in services
2. **Returning all fields**: Use DTOs to strip sensitive data
3. **Hardcoding roles**: Use enums from libs/data
4. **Missing audit logs**: Log all mutations via AuditService
5. **Client-side only validation**: Always validate server-side with class-validator
6. **Exposing stack traces**: Use exception filters, sanitize error logging
7. **Cross-org access**: Always validate organization membership before returning data
8. **Inaccessible UI**: Include ARIA attributes, focus management, keyboard support
