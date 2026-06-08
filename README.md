# TaskMaster — MERN Stack Task Management System

Full-stack task management with **Role-Based Access Control (RBAC)** and scalable API patterns.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18, React Router v6, Axios |
| Backend    | Node.js, Express 4, Mongoose |
| Database   | MongoDB 7 with connection pooling |
| Auth       | JWT (access 15m) + Refresh tokens (7d) with rotation |
| Logging    | Winston (structured logs) |
| Validation | Joi schema validation |
| Security   | Helmet, CORS, mongo-sanitize, express-rate-limit |

---

## Project Structure

```
taskmaster/
├── backend/
│   ├── config/
│   │   ├── db.js                 # Mongoose connection (pool size 10)
│   │   └── logger.js             # Winston logging
│   ├── controllers/
│   │   ├── authController.js     # JWT auth + refresh token rotation
│   │   └── taskController.js     # Paginated, RBAC-filtered CRUD + aggregation stats
│   ├── middleware/
│   │   ├── auth.js               # authenticate · restrictTo · requirePermission · requireProjectAccess
│   │   └── validate.js           # Joi request validation
│   ├── models/
│   │   ├── User.js               # RBAC roles + permissions + bcrypt
│   │   ├── Task.js               # Compound + full-text search indexes
│   │   └── Project.js            # Membership + per-project role hierarchy
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── projectRoutes.js
│   │   └── userRoutes.js
│   ├── scripts/
│   └── server.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── context/
│       │   ├── AuthContext.jsx   # Auth state, can(), hasRole()
│       │   └── ToastContext.jsx  # App-wide toast notifications
│       ├── hooks/
│       │   └── useData.js        # useTasks · useProjects · useUsers · useTaskStats
│       ├── services/
│       │   └── api.js            # Axios + auto-refresh interceptor + retry queue
│       ├── components/
│       │   ├── Layout.jsx              # Sidebar + role-filtered nav
│       │   ├── ProtectedRoute.jsx      # ProtectedRoute · RoleGate · PermissionGate
│       │   └── TaskDetailModal.jsx     # Task view: edit, comment, log hours, delete
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx       # KPI stats + breakdowns
│           ├── TasksPage.jsx           # Filtered, paginated list
│           ├── BoardPage.jsx           # Kanban (5 columns)
│           ├── ProjectsPage.jsx        # Project cards + create modal
│           └── UsersPage.jsx           # Admin role management
├── .env.example
├── .gitignore
└── package.json                        # Root convenience scripts
```

## RBAC Design

### Roles & Permissions

| Role | Permissions |
|------|-------------|
| **admin** | Manage users/roles, full CRUD on all projects and tasks |
| **manager** | Create/manage projects, create/assign/delete tasks, view team |
| **developer** | View & update own assigned tasks, log hours, comment |
| **viewer** | Read-only access to assigned content |

### Backend middleware chain

```js
router.use(authenticate);                                          // verify JWT

router.delete("/users/:id",  restrictTo("admin"), deleteUser);     // role gate
router.post("/tasks",        requirePermission("create:task"), createTask); // permission gate
router.patch("/:projectId",  requireProjectAccess("manager"), updateProject); // project role
```

### Frontend guards

```jsx
<PermissionGate permission="create:task">
  <button>New Task</button>
</PermissionGate>

<RoleGate minRole="manager">
  <AdminPanel />
</RoleGate>

// Programmatic
const { can, hasRole } = useAuth();
if (can("delete:task")) { /* show delete */ }
```

---

## Scalable API Patterns

### Paginated queries

```
GET /api/v1/tasks?page=2&limit=20&status=in_progress&priority=high&search=redis
```

```json
{
  "data": [...],
  "pagination": { "page": 2, "limit": 20, "total": 147, "pages": 8 }
}
```

Parallel count — no second round-trip:

```js
const [tasks, total] = await Promise.all([
  Task.find(filter).skip(skip).limit(limit).populate(...),
  Task.countDocuments(filter),
]);
```

### Database indexes

```js
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ title: "text", description: "text" }); // full-text search
projectSchema.index({ "members.user": 1 });
```

### JWT refresh with request queue

All concurrent requests queued while one refresh fires — no storm of parallel refresh calls:

```js
if (isRefreshing) {
  return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
    .then(token => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); });
}
```

### Abort controller

Cancels stale in-flight requests when filter params change:

```js
abortRef.current = new AbortController();
await fetchFn(params, { signal: abortRef.current.signal });
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register user |
| POST | `/api/v1/auth/login` | — | Login, returns tokens |
| POST | `/api/v1/auth/refresh` | — | Refresh access token |
| POST | `/api/v1/auth/logout` | ✓ | Revoke refresh token |
| GET | `/api/v1/auth/me` | ✓ | Current user + permissions |

### Tasks

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/tasks` | any | List (paginated + filtered) |
| GET | `/api/v1/tasks/stats` | any | Aggregated stats |
| POST | `/api/v1/tasks` | `create:task` | Create task |
| PATCH | `/api/v1/tasks/:id` | `update:assigned` | Update task |
| DELETE | `/api/v1/tasks/:id` | `delete:task` | Delete task |
| POST | `/api/v1/tasks/:id/comments` | `comment:task` | Add comment |

### Projects

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/projects` | any | My projects |
| POST | `/api/v1/projects` | manager+ | Create project |
| PATCH | `/api/v1/projects/:id` | project manager | Update project |
| POST | `/api/v1/projects/:id/members` | project manager | Add member |
| DELETE | `/api/v1/projects/:id` | admin | Delete project |

### Users (Admin only)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/users` | admin | List users |
| PATCH | `/api/v1/users/:id/role` | `manage:roles` | Change role |
| PATCH | `/api/v1/users/:id/deactivate` | admin | Deactivate user |

## Deployment

- Frontend served through Nginx
- Backend running on Node.js + Express
- Process manager: PM2
- Database: MongoDB Atlas
- Hosted on AWS EC2