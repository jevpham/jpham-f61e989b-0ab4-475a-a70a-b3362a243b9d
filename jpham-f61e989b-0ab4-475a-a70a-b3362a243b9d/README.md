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

```
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
- **Owner** - Full access, can manage organization
- **Admin** - Can manage tasks and view audit logs
- **Viewer** - Read-only access to tasks

### Task Management
- Kanban board with drag-and-drop
- Task status: Todo, In Progress, Review, Done
- Task priority: Low, Medium, High, Urgent
- Due dates and assignees
- Position-based ordering

### Audit Logging
- Automatic logging of all mutations
- Tracks user, action, resource, IP address
- Admin-only access to audit logs

### Bonus Features
- Dark mode toggle (system preference aware)
- Task completion statistics chart
- Keyboard shortcuts (Shift+? for help)

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
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

4. Set up PostgreSQL database and update `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=taskmanager
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

5. Run database migrations:
```bash
npx nx run api:migration:run
```

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

| Shortcut | Action |
|----------|--------|
| `Ctrl + D` | Toggle dark mode |
| `Ctrl + H` | Go to dashboard |
| `Ctrl + T` | Go to task board |
| `Ctrl + Shift + A` | Go to audit logs |
| `Shift + ?` | Show shortcuts help |

## Security Considerations

- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- CSRF protection recommended for production
- Rate limiting recommended for auth endpoints
- Input validation on all DTOs
- SQL injection prevention via TypeORM
- XSS prevention via Angular sanitization

## License

MIT
