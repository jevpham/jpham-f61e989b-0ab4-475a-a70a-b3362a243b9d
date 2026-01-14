# Secure Task Management System

A full-stack task management application with Role-Based Access Control (RBAC), built with NX monorepo architecture.

## Tech Stack

### Backend

- **NestJS** - Node.js framework
- **TypeORM** - ORM with PostgreSQL
- **Passport.js** - JWT authentication with refresh token rotation
- **class-validator** - DTO validation

### Frontend

- **Angular 21** - Frontend framework
- **NgRx Signals** - State management
- **TailwindCSS** - Styling
- **Angular CDK** - Drag-and-drop functionality

### Shared

- **NX Monorepo** - Workspace management
- **TypeScript** - Type safety across the stack

## Project Structure

```text
├── apps/
│   ├── api/                 # NestJS backend
│   │   └── src/
│   │       ├── auth/        # Authentication module
│   │       ├── organizations/ # Organizations & memberships
│   │       ├── tasks/       # Task management
│   │       ├── audit/       # Audit logging
│   │       └── users/       # User management
│   └── dashboard/           # Angular frontend
│       └── src/app/
│           ├── core/        # Services, guards, interceptors
│           ├── features/    # Feature components
│           ├── shared/      # Shared components
│           └── store/       # NgRx Signal stores
├── libs/
│   ├── data/                # Shared interfaces, DTOs, enums
│   └── auth/                # Shared auth utilities, decorators
└── docs/                    # Documentation
```

## Features

### Authentication

- JWT access tokens (15 min expiry)
- Refresh token rotation (7 day expiry)
- Secure password hashing with bcrypt
- Timing attack prevention

### Role-Based Access Control

Three-tier role hierarchy: **Owner > Admin > Viewer**

| Capability                 | Owner | Admin  | Viewer |
|----------------------------|:-----:|:-----: |:------:|
| View tasks                 |   ✅  |   ✅  |   ✅   |
| Create / Edit / Delete     |   ✅  |   ✅  |   ❌   |
| Drag-drop (change status)  |   ✅  |   ✅  |   ❌   |
| Add members to org         |   ✅  |   ✅  |   ❌   |
| Remove members from org    |   ✅  |   ✅  |   ❌   |
| **Change member roles**    |   ✅  |   ❌  |   ❌   |
| View audit logs            |   ✅  |   ✅  |   ❌   |

> **Key distinction**: Only **Owners** can promote/demote users (change roles).
> This prevents admins from escalating privileges or granting owner access to others.

### Task Management

- Kanban board with drag-and-drop
- Task status: Todo, In Progress, Review, Done
- Task priority: Low, Medium, High, Urgent
- Due dates and assignees
- Position-based ordering

### Audit Logging

- Automatic logging of all mutations
- Tracks user, action, resource, IP address
- Owners and Admins can view audit logs

### Bonus Features

- Dark mode toggle (system preference aware)
- Task completion statistics chart
- Keyboard shortcuts (Shift+? for help)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL or SQLite
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   # Create .env file in apps/api
   cp apps/api/.env.example apps/api/.env
   ```

4. Set up database and update `.env`:

   **Option A: SQLite (for local development)**

5. Run database migrations:

   ```bash
   npx nx run api:migration:run
   ```

6. Seed demo data (optional):

   ```bash
   node scripts/seed.js
   ```

   This creates a demo organization with three users:
   - `owner@demo.com` / `Demo@123` (Owner role)
   - `admin@demo.com` / `Demo@123` (Admin role)
   - `viewer@demo.com` / `Demo@123` (Viewer role)

   > **Note:** The SQLite database is pre-seeded, so this step is only needed if you want to reset or customize the demo data.

### Development

Start both backend and frontend:

```bash
# Backend (port 3000)
npx nx serve api

# Frontend (port 4200)
npx nx serve dashboard
```

### Building for Production

```bash
# Build all projects
npx nx build api
npx nx build dashboard

# Or build all at once
npx nx run-many -t build
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate tokens
- `GET /auth/profile` - Get current user profile

### Organizations

- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization details
- `GET /organizations/:id/members` - List members
- `POST /organizations/:id/members` - Add member
- `PUT /organizations/:id/members/:userId` - Update member role
- `DELETE /organizations/:id/members/:userId` - Remove member

### Tasks

- `GET /organizations/:orgId/tasks` - List tasks
- `POST /organizations/:orgId/tasks` - Create task
- `GET /organizations/:orgId/tasks/:id` - Get task
- `PUT /organizations/:orgId/tasks/:id` - Update task
- `DELETE /organizations/:orgId/tasks/:id` - Delete task
- `PUT /organizations/:orgId/tasks/:id/reorder` - Reorder task

### Audit Logs (Admin only)

- `GET /audit-logs` - List audit logs with pagination

## Keyboard Shortcuts

| Shortcut           | Action              | UI Fallback                      |
|--------------------|---------------------|----------------------------------|
| `Alt + D`          | Toggle dark mode    | Header theme toggle button       |
| `Alt + H`          | Go to dashboard     | Header nav "Dashboard" link      |
| `Alt + T`          | Go to task board    | Header nav "Board" link          |
| `Alt + Shift + A`  | Go to audit logs    | Header nav "Audit" link          |
| `Shift + ?`        | Show shortcuts help | User menu → "Shortcuts" option   |

> Uses `Alt` instead of `Ctrl` to avoid conflicts with browser shortcuts.

### Accessibility Note

Alt-based keyboard shortcuts may conflict with assistive technologies:
- **Screen readers** (NVDA, VoiceOver, JAWS) often use Alt as a modifier key
- **Browser accessibility modes** may intercept Alt combinations

**Workarounds:**
- All shortcut actions are accessible via the UI (see "UI Fallback" column above)
- Use `Shift + ?` to view the shortcuts dialog and access help
- Future enhancement: Shortcuts will be configurable in user settings

If you experience conflicts, access the same functionality through the navigation menu or header buttons.

## Security Considerations

- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- CSRF protection recommended for production
- Rate limiting recommended for auth endpoints
- Input validation on all DTOs
- SQL injection prevention via TypeORM
- XSS prevention via Angular sanitization

## Trade-offs & Future Improvements

| Current Implementation                 | Production Enhancement                          |
|----------------------------------------|-------------------------------------------------|
| JWT in localStorage                    | httpOnly cookies with CSRF tokens               |
| Access tokens only refresh on expiry   | Silent background refresh before expiry         |
| Basic rate limiting                    | Redis-backed rate limiting with sliding windows |
| In-memory session tracking             | Redis session store for horizontal scaling      |
| SQLite database                        | PostgreSQL with connection pooling              |
| Synchronous audit logging              | Async queue (Bull/BullMQ) for audit writes      |

## License

MIT
