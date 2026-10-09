# Project Camp

A full-stack project-management application. Teams create projects, invite members with per-project roles, plan work on a task board (tasks, subtasks and file attachments), and share project notes.

**Live app:** https://project-management-xi-red-13.vercel.app
(frontend on Vercel, API on Render, database on MongoDB Atlas; the first request after a quiet period can take up to a minute while the free Render instance wakes up)

- **Backend:** Express 5 REST API + MongoDB (Mongoose), in `src/`
- **Frontend:** React 19 + TypeScript SPA (Vite), in `frontend/`
- **Product requirements:** [PRD.md](PRD.md)
- **Architecture & flow diagrams:** [project_flowchart.md](project_flowchart.md)
- **Preparing to present this project?** See [section 22: interview guide](#22-interview-guide)

---

## Table of contents

1. [Overview](#1-overview)
2. [Problem statement](#2-problem-statement)
3. [Features](#3-features)
4. [Tech stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [Backend architecture](#6-backend-architecture)
7. [Frontend architecture](#7-frontend-architecture)
8. [Database architecture & relationships](#8-database-architecture--relationships)
9. [Authentication flow](#9-authentication-flow)
10. [Authorization / role system](#10-authorization--role-system)
11. [API documentation](#11-api-documentation)
12. [Request / response structure](#12-request--response-structure)
13. [Project structure](#13-project-structure)
14. [Environment variables](#14-environment-variables)
15. [Local development setup](#15-local-development-setup)
16. [Frontend execution flow](#16-frontend-execution-flow)
17. [Important implementation decisions](#17-important-implementation-decisions)
18. [Security considerations](#18-security-considerations)
19. [Known limitations](#19-known-limitations)
20. [Deployment](#20-deployment)
21. [Future improvements](#21-future-improvements)
22. [Interview guide](#22-interview-guide)

---

## 1. Overview

Project Camp is a Basecamp-style collaboration tool:

- Any registered user can create a project and becomes its **admin**.
- Admins invite existing users by email as **admin**, **project admin** or **member**. Roles are **per project**: the same person can be an admin in one project and a member in another.
- Each project has a **task board** (To do / In progress / Done) with assignees, attachments and subtasks, plus a shared **notes** feed.

## 2. Problem statement

Small teams need one place to see what is being worked on, who owns it and what was decided, without giving everyone full control. Project Camp combines a lightweight task board, project notes and role-based permissions. Leads can manage work while members can still see everything and tick off their steps.

## 3. Features

| Area | What users can do |
|---|---|
| **Accounts** | Register (optional full name), verify email by link, sign in with email + password, forgot/reset password by emailed link, change password, sign out. Sessions survive reloads and refresh silently. |
| **Projects** | List the projects you belong to, with your role and member count. Create, rename/describe (admin, project admin) and delete with cascade (admin). |
| **Members** | View members with roles. Invite by email (admin, project admin; only admins can grant admin). Change roles and remove members (admin). The last admin can't be demoted or removed. |
| **Tasks** | Kanban board with search and assignee filters (all / mine / unassigned). Create and edit tasks with title, description, assignee, status and up to 5 attachments of ≤1 MB each. Drag cards between columns. Delete with confirmation. Each task has a deep-linkable detail drawer. |
| **Subtasks** | Add and delete (admin, project admin). Complete and uncomplete (every member), with optimistic UI. Progress shows on the card and in the drawer. |
| **Notes** | Every member can read the notes feed. Admins create, edit and delete notes. |
| **UX** | Responsive layout with a mobile navigation drawer and horizontally scrolling board. Skeleton loading, empty and error states, toasts, confirmation dialogs, keyboard-accessible dialogs and menus. |

## 4. Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (developed and tested on v22) |
| API | Express 5, express-validator, cookie-parser, cors, multer |
| Auth | jsonwebtoken (access + refresh JWT), bcrypt, crypto (email/reset tokens) |
| Database | MongoDB with Mongoose 9 |
| Email | nodemailer + mailgen via Mailtrap SMTP |
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Routing | React Router 7 (data router) |
| Server state | TanStack Query 5 |
| HTTP | Axios |
| Forms & validation | React Hook Form + Zod (`@hookform/resolvers`) |
| Styling | Tailwind CSS 4 (+ `tailwind-merge` for class overrides) |
| UI | Custom components in `frontend/src/components/ui`, `lucide-react` icons, `sonner` toasts |
| Testing | Vitest (backend and frontend), Supertest (HTTP tests against the Express app) |
| CI | GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) |

## 5. Architecture

```
Browser
  │  React SPA (frontend/, Vite dev server :5173)
  │    Router + guards → Pages → TanStack Query hooks → api/* → Axios (+401 refresh interceptor)
  │
  │  HTTP, JSON or multipart, httpOnly cookies
  │  (dev: Vite proxies /api and /images to the backend, so the browser sees a single origin)
  ▼
Express API (src/, :8000)
  json · urlencoded · static(public) · cookieParser · CORS
  → /api/v1/{auth, projects, tasks, notes, healthcheck}
  → verifyJWT → validateProjectPermission(roles) → multer → express-validator → controller
  → ApiResponse  |  ApiError → global error handler
  ▼
MongoDB ── users, projects, projectmembers, tasks, subtasks, projectnotes
Disk     ── public/images (task attachments, served at /images/*)
Mailtrap ── verification and password-reset emails
```

Detailed diagrams: [project_flowchart.md](project_flowchart.md).

## 6. Backend architecture

| Folder | Responsibility |
|---|---|
| `src/index.js` | Loads `.env` (first import), connects to MongoDB, starts the HTTP server |
| `src/app.js` | Middleware, route mounting, global error handler |
| `src/routes/*` | Route definitions and the middleware chain for each endpoint |
| `src/middlewares/auth.middleware.js` | `verifyJWT` (cookie or `Authorization: Bearer`) and `validateProjectPermission(roles)` |
| `src/middlewares/validator.middleware.js` | Turns express-validator results into `422` responses |
| `src/middlewares/multer.middleware.js` | Disk storage in `public/images`, 1 MB per file |
| `src/validators/index.js` | express-validator rule sets |
| `src/controllers/*` | Business logic (there is no separate service layer) |
| `src/models/*` | Mongoose schemas |
| `src/utils/*` | `ApiResponse`, `ApiError`, `asyncHandler`, role/status constants, mail helpers |

**Global error handler** (`src/app.js`) maps:

| Cause | Status |
|---|---|
| `ApiError` | its own status |
| Malformed ObjectId (`BSONError`/`CastError`) | 400 `Invalid id` |
| Mongo duplicate key (`E11000`) | 409 |
| Multer error (e.g. file too large) | 400 |
| Anything else | 500 |

## 7. Frontend architecture

```
frontend/src/
├── main.tsx              QueryClientProvider, Toaster, session-expired handler
├── App.tsx               Route table (createBrowserRouter)
├── index.css             Tailwind 4 theme tokens (brand colour, font)
├── api/                  HTTP only: one module per resource (authApi, projectApi, memberApi, taskApi, noteApi)
├── hooks/                TanStack Query hooks: useAuth, useProjects, useMembers, useTasks, useNotes
├── lib/
│   ├── http.ts           Axios instance + single-flight refresh interceptor
│   ├── queryClient.ts    QueryClient defaults + query keys
│   ├── errors.ts         parseApiError, toastError, applyApiErrorToForm (422 → fields)
│   ├── permissions.ts    Role → capability matrix mirroring the backend
│   ├── validation.ts     Shared Zod rules
│   └── utils.ts          cn, formatting, labels, limits
├── routes/guards.tsx     ProtectedRoute, PublicOnlyRoute
├── types/index.ts        Types matching the API (User, Project, Task, …)
├── components/
│   ├── ui/               Button, Field (Input/Select/Textarea/FormField), Dialog, ConfirmDialog,
│   │                     DropdownMenu, Avatar, Badge, States (Skeleton/Empty/Error), Spinner
│   ├── layout/           AppLayout, AuthLayout, Sidebar, Topbar (breadcrumbs, user menu), Logo, PageHeader
│   ├── projects/         ProjectCard, ProjectFormDialog (+ shared ProjectFields), ProjectIcon
│   ├── tasks/            TaskBoard, TaskCard, TaskFormDialog, FilePicker, SubtaskList, AttachmentList
│   ├── members/          InviteMemberDialog, MemberRow
│   └── notes/            NoteCard, NoteFormDialog
└── pages/
    ├── auth/             Login, Register, ForgotPassword, ResetPassword, VerifyEmail
    ├── project/          ProjectLayout, TasksPage, TaskDetailDrawer, NotesPage, MembersPage, ProjectSettingsPage
    ├── ProjectsPage.tsx, AccountPage.tsx, ErrorPages.tsx
```

**Layering rule:** components never call Axios. Pages use hooks, hooks call `api/*`, and only `api/*` knows URLs and response envelopes.

### Routes

| Route | Page | Access |
|---|---|---|
| `/login`, `/register`, `/forgot-password` | Auth pages | Signed-out only (signed-in users are redirected) |
| `/reset-password/:resetToken` | Reset password | Public (opened from email) |
| `/verify-email/:verificationToken` | Email verification | Public (opened from email) |
| `/` | → `/projects` | Signed in |
| `/projects` | Projects grid | Signed in |
| `/projects/:projectId` | → `tasks` | Project member |
| `/projects/:projectId/tasks` | Task board | Project member |
| `/projects/:projectId/tasks/:taskId` | Task detail drawer over the board | Project member |
| `/projects/:projectId/notes` | Notes | Project member |
| `/projects/:projectId/members` | Members | Project member |
| `/projects/:projectId/settings` | Edit / delete project | admin, project_admin (others are redirected to tasks) |
| `/account` | Profile, change password, sign out | Signed in |
| `*` | 404 page | Anyone |

### Pages → APIs

| Page / component | Queries | Mutations |
|---|---|---|
| Route guards, Topbar, Account | `POST /auth/current-user` | `POST /auth/logout`, `POST /auth/change-password`, `POST /auth/resend-email-verification` |
| Login / Register / Forgot / Reset / Verify | `GET /auth/verify-email/:token` | `POST /auth/login`, `/register`, `/forgot-password`, `/reset-password/:token` |
| Sidebar, ProjectsPage | `GET /projects` | `POST /projects` |
| ProjectLayout, Settings | `GET /projects/:id` | `PUT /projects/:id`, `DELETE /projects/:id` |
| MembersPage, TaskFormDialog (assignee) | `GET /projects/:id/members` | `POST /projects/:id/members`, `PUT`/`DELETE /projects/:id/members/:userId` |
| TasksPage / TaskBoard | `GET /tasks/:projectId` | `POST /tasks/:projectId`, `PUT /tasks/:projectId/t/:taskId` (status) |
| TaskDetailDrawer | `GET /tasks/:projectId/t/:taskId` | `PUT`/`DELETE /tasks/:projectId/t/:taskId`, subtask `POST`/`PUT`/`DELETE` |
| NotesPage | `GET /notes/:projectId` | `POST /notes/:projectId`, `PUT`/`DELETE /notes/:projectId/n/:noteId` |

### Query keys and invalidation

```
['auth', 'me']                              current user (null when signed out)
['projects']                                project list
['projects', id]                            project detail + caller role
['projects', id, 'members']
['projects', id, 'tasks']                   board
['projects', id, 'tasks', taskId]           task detail
['projects', id, 'notes']
```

Task mutations invalidate `['projects', id, 'tasks']`, which also covers every cached task detail. Membership changes also invalidate `['projects']` because the cards show member counts. Signing in or out removes every non-auth query, so data never leaks between users.

## 8. Database architecture & relationships

```
User ──< ProjectMember >── Project ──< Task ──< Subtask
                              └──────< ProjectNote
```

| Collection | Key fields |
|---|---|
| `users` | `username` (unique, lowercase), `email`, `FullName`, `password` (bcrypt), `avatar {url, localPath}`, `isEmailVerified`, `refreshToken`, hashed `emailVerificationToken`/`forgotPasswordToken` + expiries |
| `projects` | `name` (globally unique), `description`, `createdBy → User` |
| `projectmembers` | `user → User`, `project → Project`, `role ∈ {admin, project_admin, member}` |
| `tasks` | `title`, `description`, `project`, `assignedTo → User`, `assignedBy → User` (creator), `status ∈ {todo, in_progress, done}`, `attachements[] {url, mimeType, size}` |
| `subtasks` | `title`, `task → Task`, `isCompleted`, `createdBy → User` |
| `projectnotes` | `project`, `createdBy → User`, `content` |

> Field names such as `FullName` and `attachements` are spelled exactly as in the schema and the API.

Deleting a project removes its memberships, tasks, subtasks and notes. Deleting a task removes its subtasks.

## 9. Authentication flow

1. **Register:** `POST /auth/register` creates the user and emails `EMAIL_VERIFICATION_REDIRECT_URL/<token>` (valid 20 minutes, stored as SHA-256).
2. **Verify:** the frontend page `/verify-email/:token` calls `GET /auth/verify-email/:token`.
3. **Login:** `POST /auth/login` sets **httpOnly** `accessToken` and `refreshToken` cookies. The refresh token is also stored on the user.
4. **Every request:** Axios sends cookies (`withCredentials`). `verifyJWT` reads the cookie (or a `Bearer` header).
5. **Expiry:** on a 401, the interceptor calls `POST /auth/refresh-token` once (shared by concurrent requests). The backend rotates both tokens, and the original request is retried. If the refresh fails, the session is cleared and the user is sent to `/login`, returning to the same page after signing in.
6. **Logout:** `POST /auth/logout` clears the stored refresh token and both cookies.
7. **Forgot password:** `POST /auth/forgot-password` emails `FORGOT_PASSWORD_REDIRECT_URL/<token>`. The frontend page `/reset-password/:token` posts the new password.

The frontend **never reads or stores tokens** (no localStorage). Login responses also contain the tokens for non-browser clients, but the SPA ignores them.

## 10. Authorization / role system

Roles are stored per project on `ProjectMember` and enforced by `validateProjectPermission(roles)`. Non-members get **404** and members without the required role get **403**. The frontend mirrors this matrix in `frontend/src/lib/permissions.ts` and hides any control the API would reject.

| Capability | admin | project_admin | member |
|---|:-:|:-:|:-:|
| View project, tasks, task details, notes, members | ✓ | ✓ | ✓ |
| Complete / uncomplete subtasks | ✓ | ✓ | ✓ |
| Create / edit / delete tasks, change task status | ✓ | ✓ | ✗ |
| Create / delete subtasks | ✓ | ✓ | ✗ |
| Edit project name / description | ✓ | ✓ | ✗ |
| Add members | ✓ (any role) | ✓ (member or project_admin only) | ✗ |
| Change member roles, remove members | ✓ | ✗ | ✗ |
| Create / edit / delete notes | ✓ | ✗ | ✗ |
| Delete project | ✓ | ✗ | ✗ |

Any signed-in user can create a project and becomes its admin. A project must always keep at least one admin.

> PRD.md's permission matrix differs in places, e.g. it says only admins can create projects or edit them. This table describes what the code enforces.

## 11. API documentation

Base URL: `/api/v1`. 🔒 = needs authentication. Roles refer to the caller's role in `:projectId`.

### Auth: `/auth`

| Method | Path | Body | Auth | Success |
|---|---|---|---|---|
| POST | `/register` | `{email, username, password, fullname?}` | – | 201 `{user}` |
| POST | `/login` | `{email, password}` | – | 200 `{user, accessToken, refreshToken}` + cookies |
| POST | `/logout` | – | 🔒 | 200, cookies cleared |
| POST | `/current-user` *(POST, not GET)* | – | 🔒 | 200 user |
| POST | `/change-password` | `{oldPassword, newPassword}` | 🔒 | 200 |
| POST | `/refresh-token` | cookie (or `{refreshToken}`) | – | 200 new tokens + cookies |
| GET | `/verify-email/:verificationToken` | – | – | 200 `{isEmailVerified:true}` / 400 |
| POST | `/forgot-password` | `{email}` | – | 200 / 404 |
| POST | `/reset-password/:resetToken` | `{newPassword}` | – | 200 / 400 |
| POST | `/resend-email-verification` | – | 🔒 | 200 / 409 already verified |

### Projects: `/projects` 🔒

| Method | Path | Body | Roles | Success |
|---|---|---|---|---|
| GET | `/` | – | any user | `[{projects:{_id,name,description,members,createdAt,createdBy}, role}]` |
| POST | `/` | `{name, description?}` | any user | project (creator becomes admin); 409 duplicate name |
| GET | `/:projectId` | – | all | project + `role` |
| PUT | `/:projectId` | `{name, description?}` | admin, project_admin | 202 project |
| DELETE | `/:projectId` | – | admin | 202, cascades |
| GET | `/:projectId/members` | – | all | `[{project, user:{_id,username,FullName,email,avatar}, role, createdAt, updatedAt}]` |
| POST | `/:projectId/members` | `{email, role}` | admin, project_admin | 201 user; 404 unknown email; 409 already member; 403 project_admin granting admin |
| PUT | `/:projectId/members/:userId` | `{newRole}` | admin | 200; 400 last admin |
| DELETE | `/:projectId/members/:userId` | – | admin | 200; 404; 400 last admin |

### Tasks: `/tasks` 🔒

| Method | Path | Body | Roles | Success |
|---|---|---|---|---|
| GET | `/:projectId` | – | all | tasks (newest first) with `assignedTo` populated, `subtaskCount`, `completedSubtaskCount` |
| POST | `/:projectId` | multipart: `title`, `description?`, `assignedTo?`, `status?`, `attachements[]` (≤5, ≤1 MB) | admin, project_admin | 201 task |
| GET | `/:projectId/t/:taskId` | – | all | task + `assignedTo`, `assignedBy`, `subtasks[]` (with `createdBy`) |
| PUT | `/:projectId/t/:taskId` | JSON or multipart; partial `{title, description, status, assignedTo}` (`assignedTo: ""` unassigns); new files are appended | admin, project_admin | 200 task |
| DELETE | `/:projectId/t/:taskId` | – | admin, project_admin | 200, also deletes subtasks |
| POST | `/:projectId/t/:taskId/subtasks` | `{title}` | admin, project_admin | 201 subtask |
| PUT | `/:projectId/st/:subTaskId` | `{title?, isCompleted?}` | all | 200 subtask |
| DELETE | `/:projectId/st/:subTaskId` | – | admin, project_admin | 200 |

The assignee must be a project member (400 otherwise), and `status` must be one of `todo | in_progress | done` (400 otherwise). Tasks, subtasks and notes are always looked up within `:projectId`, so IDs from other projects return 404.

### Notes: `/notes` 🔒

| Method | Path | Body | Roles |
|---|---|---|---|
| GET | `/:projectId` | – | all |
| POST | `/:projectId` | `{content}` | admin |
| GET | `/:projectId/n/:noteId` | – | all |
| PUT | `/:projectId/n/:noteId` | `{content}` | admin |
| DELETE | `/:projectId/n/:noteId` | – | admin |

### Health: `GET /healthcheck` → `{message: "Server is running"}`

Uploaded attachments are served statically at `/images/<timestamp>-<filename>`.

## 12. Request / response structure

**Success**

```json
{ "statusCode": 200, "data": { }, "message": "Tasks fetched successfully", "success": true }
```

Some controllers put an object in `message` (e.g. `{ "message": "Project updated successfully" }`), so the frontend never renders `message` directly.

**Error**

```json
{ "success": false, "message": "Received data is not valid", "errors": [{ "email": "Email is invalid" }] }
```

| Status | Meaning | Frontend behaviour |
|---|---|---|
| 200/201/202 | Success | Update the cache, toast |
| 400 | Bad request / invalid id / business rule | Form alert or not-found state |
| 401 | Not authenticated / expired | Silent refresh → retry → `/login` |
| 403 | Role not allowed | Access-denied state or toast |
| 404 | Not found, or not a member of the project | Not-found state or field error |
| 409 | Conflict (duplicate name, already a member, already verified) | Field error |
| 422 | Validation failed | `errors[]` mapped onto form fields |
| 500 | Server error | Generic message + retry (queries are retried twice automatically) |

## 13. Project structure

```
Project_Management/
├── src/                        Express API
│   ├── index.js · app.js
│   ├── controllers/            auth, project, task, note, healthcheck
│   ├── routes/                 auth, project, task, note, healthcheck
│   ├── middlewares/            auth, validator, multer
│   ├── models/                 user, project, projectmember, task, subtask, note
│   ├── validators/index.js
│   ├── db/database.js
│   └── utils/                  api-error, api-response, async-handles, constants, mail
├── tests/                      Backend unit + HTTP tests (Vitest, Supertest)
├── public/images/              Uploaded attachments (git-ignored except .gitkeep)
├── .github/workflows/ci.yml    CI pipeline: tests, typecheck and build on every push/PR
├── frontend/                   React SPA (see section 7)
│   ├── src/ · public/ · index.html   (unit tests sit next to the code: src/lib/*.test.ts)
│   ├── vite.config.ts · tsconfig*.json · package.json
│   └── .env.example
├── vitest.config.js            Backend test config (fake JWT secrets, no DB needed)
├── .env.example                Backend environment template
├── PRD.md                      Product requirements
├── project_flowchart.md        Architecture & flow diagrams
└── package.json                Backend package
```

## 14. Environment variables

### Backend (`.env` in the repository root; template: [.env.example](.env.example))

| Variable | Purpose | Local value |
|---|---|---|
| `PORT` | API port | `8000` |
| `NODE_ENV` | `production` turns on `Secure` cookies | `development` |
| `CORS_ORIGIN` | Comma-separated allowed origins (exact match) | `http://localhost:5173` |
| `SERVER_URL` | Public API base URL used in attachment URLs (falls back to the request host) | `http://localhost:8000` |
| `MONGO_URI` | MongoDB connection string | your connection string |
| `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY` | Access JWT | secret, e.g. `1d` |
| `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY` | Refresh JWT | secret, e.g. `10d` |
| `MAILTRAP_SMTP_HOST`, `MAILTRAP_SMTP_PORT`, `MAILTRAP_SMTP_USERNAME`, `MAILTRAP_SMTP_PASSWORD` | SMTP for emails | Mailtrap sandbox credentials |
| `FORGOT_PASSWORD_REDIRECT_URL` | Frontend reset page; the token is appended | `http://localhost:5173/reset-password` |
| `EMAIL_VERIFICATION_REDIRECT_URL` | Frontend verify page; the token is appended. If unset, links point at the API endpoint | `http://localhost:5173/verify-email` |

### Frontend (`frontend/.env`, optional; template: [frontend/.env.example](frontend/.env.example))

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | API base used by the browser | `/api/v1` (Vite proxy) |
| `VITE_DEV_BACKEND_URL` | Dev-server proxy target for `/api` and `/images` | `http://localhost:8000` |

## 15. Local development setup

**Prerequisites:** Node.js 20+ (tested with 22), a MongoDB instance (local or Atlas), and optionally a Mailtrap inbox for emails.

### Backend

```bash
# repository root
npm install
cp .env.example .env        # then fill in MONGO_URI, JWT secrets, Mailtrap credentials
npm run dev                 # nodemon → http://localhost:8000
# production-style: npm start
```

Check: `curl http://localhost:8000/api/v1/healthcheck`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # optional; defaults work with the backend on :8000
npm run dev                 # http://localhost:5173
```

### Running the application

Start the backend first, then the frontend, and open **http://localhost:5173**. Register an account, sign in and create a project. To try roles, register a second account in a private window and invite it from **Members**.

### Useful scripts

| Where | Command | What it does |
|---|---|---|
| root | `npm run dev` / `npm start` | API with / without auto-reload |
| root | `npm test` / `npm run test:watch` | Backend tests once / in watch mode |
| frontend | `npm run dev` | Vite dev server with API proxy |
| frontend | `npm test` / `npm run test:watch` | Frontend tests once / in watch mode |
| frontend | `npm run typecheck` | TypeScript project check |
| frontend | `npm run build` | Type-check + production build into `frontend/dist` |
| frontend | `npm run preview` | Serve the production build locally |

### Running the tests

```bash
npm test                    # backend, from the repository root
cd frontend && npm test     # frontend
```

Neither suite needs MongoDB, a `.env` file or a running server, so they also run as-is in CI.

| Suite | Files | What is covered |
|---|---|---|
| Backend: utilities | [`tests/utils.test.js`](tests/utils.test.js) | `ApiError`, `ApiResponse`, `asyncHandler` forwarding errors to `next()`, role and status constants |
| Backend: validators | [`tests/validators.test.js`](tests/validators.test.js) | express-validator rules for register, login, projects, members and tasks, and the `validate` middleware returning 422 with `{ field: message }` errors |
| Backend: HTTP | [`tests/app.test.js`](tests/app.test.js) | Through Supertest on the real Express app: healthcheck, CORS allow/deny, 422 validation responses, 401 for missing, wrongly signed and malformed tokens, and the JSON error format |
| Frontend: helpers | [`frontend/src/lib/utils.test.ts`](frontend/src/lib/utils.test.ts) | Class merging, display names and initials, byte formatting, attachment names, stable project colours |
| Frontend: permissions | [`frontend/src/lib/permissions.test.ts`](frontend/src/lib/permissions.test.ts) | The role → action matrix the UI uses to show or hide actions |
| Frontend: validation | [`frontend/src/lib/validation.test.ts`](frontend/src/lib/validation.test.ts) | Zod rules for email, new passwords and usernames |
| Frontend: API errors | [`frontend/src/lib/errors.test.ts`](frontend/src/lib/errors.test.ts) | Parsing API errors (422 field errors, hidden 5xx details, network errors) and mapping them onto form fields |

The HTTP tests only hit paths that respond before any database query (validation and auth checks), which is why no database is needed. Flows that read or write data (creating projects, tasks, members) are not unit-tested yet; see section 21.

## 16. Frontend execution flow

```
main.tsx → QueryClient + session-expired handler → RouterProvider
  → route guard → useCurrentUser() (POST /auth/current-user; a 401 triggers one silent refresh)
      ├─ no session → /login (remembers the target page)
      └─ session → AppLayout (Sidebar loads GET /projects)
           → page mounts → useQuery → skeleton → data | empty | not-found | access-denied | retry
           → user action → Zod → useMutation → api/* → Axios
                ├─ success → invalidate / optimistic cache update → re-render + toast
                └─ failure → 422 field errors | 409 / 404 field error | 403 / 5xx toast (+ rollback)
```

Full diagrams for every feature are in [project_flowchart.md](project_flowchart.md).

## 17. Important implementation decisions

| Decision | Reason |
|---|---|
| httpOnly cookies + Vite dev proxy | Tokens can't be read by scripts (XSS), and the proxy gives a single origin in development, so cookies and CORS just work. |
| Single-flight refresh interceptor | The backend rotates refresh tokens. Parallel refreshes would invalidate each other and log the user out. |
| TanStack Query as the only server state store | Almost all state is server data. Caching, deduplication, retries and invalidation come built in, and no global store is needed. |
| Role taken from `GET /projects/:id` | One source for the caller's role on every project page (added to the backend response). |
| Optimistic updates only for status moves and subtask toggles | Both are idempotent and roll back cleanly. Creates and deletes wait for the server. |
| Task detail as a routed drawer (`/tasks/:taskId`) | Deep-linkable and shareable, while keeping the board visible behind it. |
| Custom portal dialogs instead of native `<dialog>` | Native modal dialogs render in the browser's top layer and would hide toast notifications. |
| `tailwind-merge` in `cn()` | Lets components accept class overrides (e.g. `h-8` over the default `h-9`) without depending on CSS order. |
| Minimal backend changes | Only fixes required by the frontend, plus security fixes. See the changelog below. |

### Backend changes made for the frontend

- `dotenv` now loads before `app.js` is evaluated, so `CORS_ORIGIN` is actually read. Origins are trimmed.
- Cookie options are consistent across login, refresh and logout (`Secure` only in production, `SameSite=Lax`).
- `current-user` returns `username`, and no longer returns the reset token hash.
- Registration saves `fullname` to `FullName`.
- Verification links point to the frontend (`EMAIL_VERIFICATION_REDIRECT_URL`). The resend link's broken `/users/` path is fixed. An invalid token now returns 400 instead of 200.
- `refresh-token` returns 401 instead of 500 when there is no body or cookie.
- Projects: member count is fixed, the detail includes the caller's role, `DELETE` no longer requires a body, and deletes cascade.
- Members: the list includes `role`, `FullName` and `email` and requires membership. Adding a member returns a sanitised user (previously the password hash), rejects existing members (409) and stops project_admins granting admin. The last admin is protected, and removing an unknown member returns 404.
- Tasks: the assignee is populated with `username`/`FullName`, the list includes subtask counts, and `status` is honoured on create and validated. Assignees must be project members, `assignedTo: ""` unassigns, and attachment URLs and `mimeType` are fixed.
- Cross-project isolation: every task, subtask and note read/update/delete is scoped to `:projectId`.
- The error handler maps invalid ids → 400, duplicate keys → 409 and upload errors → 400.

## 18. Security considerations

- **Sessions:** httpOnly cookies, `Secure` in production, `SameSite=Lax`. Refresh tokens are rotated and server-side invalidated on logout.
- **CSRF:** `SameSite=Lax` cookies plus JSON/multipart APIs give reasonable protection, and the deployment is same-origin (Vercel rewrites `/api` to Render), so `SameSite=Lax` applies. If the API were ever called cross-site (`SameSite=None`), CSRF tokens would be needed.
- **Passwords:** bcrypt (10 rounds). Email and reset tokens are random and stored hashed, with a 20-minute expiry.
- **Authorization:** every project route checks membership and role, and every child resource is scoped to its project.
- **Data exposure:** user responses exclude the password, refresh token and verification/reset tokens.
- **Uploads:** 1 MB / 5 files. There is no file-type allow-list and original filenames are kept (prefixed with a timestamp). Files are publicly readable by URL.
- **Not implemented:** rate limiting (login, forgot-password), account lockout, enforced email verification, Helmet security headers.
- **User enumeration:** login ("User doesn't exist"), forgot-password (404) and member invites reveal whether an email is registered.

## 19. Known limitations

Things the current backend doesn't support, so the UI doesn't offer them:

- No profile editing or avatar upload (no endpoint). Avatars show initials.
- No user search. Members are added by the exact email of an existing account, and no invitation email is sent.
- Attachments can't be removed or renamed, and they live on local disk, which won't survive ephemeral or multi-instance hosting.
- No pagination or server-side search. Lists load fully and filtering happens on the client.
- Members can't change task status (by design: only admins and project admins can).
- Project names are unique across the whole system, not per user.
- Login is by email only (the backend ignores `username`).
- Email verification isn't enforced. Unverified users see a reminder banner.
- No real-time updates. Data refreshes on mutations and on window focus.
- Tasks stay assigned to a member after they are removed from the project.
- The committed tests are unit and HTTP-level tests that don't touch the database. There are no database-backed integration tests or browser (end-to-end) tests in CI yet.
- The production JS bundle is about 690 kB (about 212 kB gzipped). Route-level code splitting isn't done yet.
- Mongoose logs deprecation warnings for the `new` option on `findOneAndUpdate`. They're harmless.

## 20. Deployment

**Status: deployed.**

| Part | Host | URL |
|---|---|---|
| Frontend | Vercel (root directory `frontend`) | https://project-management-xi-red-13.vercel.app |
| Backend API | Render web service (free) | https://project-management-o65w.onrender.com (health: `/api/v1/healthcheck`) |
| Database | MongoDB Atlas | – |
| Email | Mailtrap (sandbox: emails are captured in the Mailtrap inbox, not delivered) | – |

Every push to `main` redeploys both Vercel and Render automatically.

### Continuous integration (GitHub Actions)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and on every pull request into `main`. It has two jobs that run in parallel on Ubuntu with Node.js 22:

| Job | Steps |
|---|---|
| Backend tests | `npm ci` → `npm test` |
| Frontend tests, typecheck & build | `npm ci` → `npm test` → `npm run build` (runs `tsc -b`, then `vite build`) |

The result shows as a ✓ or ✗ next to each commit and pull request on GitHub (Actions tab for the logs). Deployment (CD) is still done by Vercel and Render, which deploy every push to `main` on their own. They don't wait for CI, so a failing commit is still deployed. To deploy only green builds, turn on Render's "Auto-Deploy: After CI checks pass" setting, and/or protect `main` on GitHub so pull requests can only merge once both CI jobs pass.

```
git push ──► GitHub
              ├─ GitHub Actions: backend tests │ frontend tests + typecheck + build   (CI)
              ├─ Render: npm install → npm start                                     (CD, API)
              └─ Vercel: npm run build → frontend/dist                               (CD, frontend)
```

```
Browser ──► https://<app>.vercel.app
              ├─ /assets, SPA routes ──► static files (frontend/dist)
              └─ /api/*, /images/*  ──► rewrite ──► https://<service>.onrender.com
```

[`frontend/vercel.json`](frontend/vercel.json) forwards `/api` and `/images` to Render. The browser only ever talks to the Vercel domain, so auth cookies stay **first-party**: `SameSite=Lax` keeps working, no CORS is involved, and browsers that block third-party cookies (Safari/iOS) still work. `VITE_API_BASE_URL` stays `/api/v1`.

### Backend (Render web service)

| Setting | Value |
|---|---|
| Root directory | *(empty, repository root)* |
| Build command | `npm install` |
| Start command | `npm start` |
| Environment | every variable from section 14, plus `NODE_ENV=production`, `CORS_ORIGIN=https://<app>.vercel.app`, `SERVER_URL=https://<app>.vercel.app`, `FORGOT_PASSWORD_REDIRECT_URL=https://<app>.vercel.app/reset-password`, `EMAIL_VERIFICATION_REDIRECT_URL=https://<app>.vercel.app/verify-email`. Render provides `PORT` itself. |

MongoDB Atlas → Network Access must allow `0.0.0.0/0`, because Render's free tier has no fixed outbound IP.

### Problems hit during the first deployment

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '/opt/render/project/src/index.js'` | Render's default start command `node index.js` (entry file is `src/index.js`) | Start command `npm start` |
| Deploy stuck after "MongoDB connected" for 20+ minutes | `npm start` was entered as the **build** command, so the build step never finished | Build `npm install`, start `npm start` |
| `MongoParseError: Invalid scheme` | `.env` line read `MONGO_URI=MONGO_URI=mongodb+srv://…` | Remove the duplicated key |
| `bad auth: authentication failed` | Atlas login used instead of a database user | Create a user under Atlas → Security → Database Access |
| `550 Sending from domain gmail.com is not allowed` | Mailtrap's live sending only allows verified domains | Use the Mailtrap sandbox for now |
| Attachment links pointed to `localhost:8000` | URL variables were updated in the local `.env`, not in Render's Environment | Set them in Render and redeploy |

### Frontend (Vercel project)

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite (build `npm run build`, output `dist`) |
| Before deploying | replace `YOUR-RENDER-SERVICE` in `frontend/vercel.json` with the Render service name |

### Free-tier caveats

- Render free services sleep after ~15 minutes idle. The first request afterwards can take up to a minute.
- Render's free disk is ephemeral: **uploaded attachments are lost on every redeploy or restart.** Use object storage (e.g. Cloudinary, S3) for durable uploads.
- Mailtrap's sandbox only captures emails. Real delivery needs a verified sending domain or another SMTP provider.

## 21. Future improvements

- More automated tests: database-backed API integration tests (Supertest + mongodb-memory-server) and Playwright UI tests, added to the CI workflow
- Profile editing and avatar upload; invitation emails and pending invites
- Attachment removal and object storage (S3-compatible)
- Due dates, priorities, comments and an activity history on tasks
- Ordering within columns, and pagination / server-side search
- Rate limiting, Helmet and enforced email verification
- Route-level code splitting; real-time updates (WebSocket / SSE)
- Dark mode

---

## 22. Interview guide

This section explains the project in plain language so you can present it and answer questions about it. Each answer points to the real file, so you can open the code and check.

### 22.1 The 30-second pitch

> "Project Camp is a full-stack project-management app, like a small Basecamp. Users create projects, invite teammates by email and give them one of three roles per project: admin, project admin or member. Each project has a Kanban task board with subtasks, file attachments and assignees, plus a shared notes feed. The backend is an Express 5 REST API on MongoDB with JWT authentication in httpOnly cookies and role-based permissions. The frontend is React with TypeScript, TanStack Query and Tailwind. It's deployed with the frontend on Vercel and the API on Render."

### 22.2 The two-minute architecture walkthrough

1. **The browser loads the React app** from Vercel. React Router decides which page to show, and a route guard checks whether you're signed in by calling `POST /api/v1/auth/current-user`.
2. **All API calls go to the same domain** (`/api/...`). Vercel forwards them to the Express server on Render (`frontend/vercel.json`), so the browser thinks it's talking to one website.
3. **Express runs a middleware chain** for each request: parse JSON, read cookies, verify the JWT (`verifyJWT`), check the user's role in that project (`validateProjectPermission`), validate input (express-validator), then run the controller.
4. **The controller talks to MongoDB** through Mongoose models and returns a standard `ApiResponse` object. Any thrown `ApiError` goes to one global error handler.
5. **On the frontend, TanStack Query caches the response.** When you change something, the matching cache entries are invalidated and refetched, so every page stays in sync without a global store.

### 22.3 Trace one request end to end

*A member ticks a subtask as done.* This is a good one to tell because it touches every layer.

| Step | What happens | Where |
|---|---|---|
| 1 | The user clicks the checkbox in the task drawer | `components/tasks/SubtaskList.tsx` |
| 2 | `useToggleSubtask` updates the cache **before** the server answers (optimistic UI): the checkbox flips and the card's "2/3" counter changes immediately | `hooks/useTasks.ts` |
| 3 | `taskApi.updateSubtask` sends `PUT /api/v1/tasks/:projectId/st/:subTaskId {isCompleted:true}` with cookies | `api/taskApi.ts`, `lib/http.ts` |
| 4 | Vercel forwards the request to Render | `frontend/vercel.json` |
| 5 | `verifyJWT` reads the `accessToken` cookie, verifies it and loads the user | `src/middlewares/auth.middleware.js` |
| 6 | `validateProjectPermission(all roles)` finds the user's `ProjectMember` row for this project: not a member → 404 | same file |
| 7 | `updateSubTask` loads the subtask, then checks that its parent task belongs to `:projectId` (blocks cross-project access), and saves | `src/controllers/task.controller.js` |
| 8 | Response `200 {data: subtask}`. On error, the cache is rolled back to the saved snapshot and a toast appears | `hooks/useTasks.ts` |
| 9 | `onSettled` invalidates the task queries, so the board and drawer refetch the real values | `hooks/useTasks.ts` |

### 22.4 Key concepts in your own words

**Authentication: access token + refresh token**
- On login the server creates two JWTs. The **access token** (expires in 1 day) proves who you are on every request. The **refresh token** (10 days) is only used to get a new access token.
- Both are stored in **httpOnly cookies**, which JavaScript can't read. So even if an attacker injected a script (XSS), they couldn't steal the tokens. That's why tokens are *not* stored in localStorage.
- The refresh token is also saved in the database. That allows **rotation**: every refresh issues a new pair and replaces the stored one, so a stolen old refresh token stops working. Logout clears it.
- Passwords are hashed with **bcrypt** in a Mongoose `pre("save")` hook (`src/models/user.models.js`), only when the password field changed.
- Email verification and reset tokens are random bytes. The email contains the raw token, and the database stores only its **SHA-256 hash**, with a 20-minute expiry. A database leak therefore doesn't expose usable tokens.

**The silent refresh (`frontend/src/lib/http.ts`)**
- When any request returns **401**, an Axios interceptor calls `/auth/refresh-token` and then retries the original request. The user never notices.
- It's **single-flight**: if five requests fail at once, they all wait for *one* refresh. Because the backend rotates refresh tokens, five parallel refreshes would invalidate each other and log the user out.
- If the refresh fails, the session is cleared and the route guard sends the user to `/login`, remembering the page they were on.

**Cookies across Vercel and Render**
- `vercel.app` and `onrender.com` are different "sites", so cookies set by Render would be **third-party cookies**. Safari and iOS block those.
- Solution: Vercel **rewrites** `/api/*` to Render. The browser only sees the Vercel domain, so cookies are first-party, `SameSite=Lax` works, and CORS isn't even involved.

**Authorization: per-project roles (RBAC)**
- Roles aren't stored on the user. They live in a **junction collection** `ProjectMember {user, project, role}`, so one person can be admin in one project and member in another.
- `validateProjectPermission([...roles])` is a middleware factory: it takes the allowed roles and returns a middleware. That's why the routes read like `validateProjectPermission([ADMIN, PROJECT_ADMIN])`.
- The frontend copies the same matrix in `lib/permissions.ts` and hides buttons the API would reject. The **backend is still the real protection**; hiding buttons is only UX.

**IDOR (Insecure Direct Object Reference), the most important security fix**
- Originally, the permission middleware checked membership of `:projectId` from the URL, but the controllers then loaded tasks and notes **by their own id only**.
- So a member of project A could send `/tasks/<A>/t/<task id from project B>` and read or edit project B's task.
- Fix: every lookup is scoped, e.g. `Task.findOne({ _id: taskId, project: projectId })`. Subtasks are checked through their parent task. An end-to-end test confirmed cross-project requests now return 404.

**MongoDB aggregation**
- `GET /projects` starts from the user's `ProjectMember` rows, uses `$lookup` to join the projects, and counts members with a second `$lookup` (`project.controller.js`).
- `GET /tasks/:projectId/t/:taskId` uses several `$lookup`s to return the task with assignee, creator and subtasks (each with its creator) in **one query**.
- The board shows subtask progress using one `$group` query over all subtasks (`completed: {$sum: {$cond: ["$isCompleted", 1, 0]}}`), instead of one query per task (avoids the N+1 problem).

**File uploads**
- `multer` saves files to `public/images` as `<timestamp>-<name>` (1 MB limit, 5 files). Express serves that folder statically, so the file URL is `SERVER_URL/images/<file>`.
- The frontend sends `multipart/form-data` (`FormData`) for task create/edit.

**Frontend state: TanStack Query**
- Almost all state in this app is **server state** (data owned by the backend), so there's no Redux. TanStack Query handles caching, loading and error states, retries and refetching.
- **Query keys** are hierarchical: `['projects', id, 'tasks']`. Invalidating that prefix refreshes the board *and* every cached task detail of that project.
- **Optimistic updates** are used only where they're safe and easy to undo (moving a card between columns, ticking a subtask). Creates and deletes wait for the server.

**Forms: React Hook Form + Zod**
- Zod schemas validate on the client (e.g. password ≥ 8, passwords match). The backend validates again with express-validator, because the client can't be trusted.
- When the server returns **422** with `errors: [{ field: message }]`, `applyApiErrorToForm` puts each message under the right input (`lib/errors.ts`).

**Error handling, end to end**
- Backend: controllers are wrapped in `asyncHandler`, so any thrown error reaches the global handler, which returns `{success:false, message, errors}`. It also maps a bad ObjectId to 400, a duplicate key to 409 and an upload error to 400.
- Frontend: each status has its own UI. 401 → silent refresh, 403 → "access denied", 404 → "not found", 409/422 → field error, 5xx → retry button (queries auto-retry twice first).

### 22.5 "What was the hardest technical problem?": auth cookies across two domains

Use this as the main answer. Remember the one-line version first, then expand if asked.

> **One line:** "After deploying, login worked but the next request returned 401, because the frontend and API were on different domains and the auth cookie was being treated as third-party. I fixed it with Vercel rewrites so the browser only ever talks to one domain."

**The full story (situation → problem → cause → fix → result)**

1. **Situation.** The frontend was on Vercel (`*.vercel.app`) and the API on Render (`*.onrender.com`). Auth uses JWTs in httpOnly cookies.
2. **Problem.** Login succeeded, but the very next request returned 401 and the user looked logged out.
3. **Cause.** To the browser these are two different sites, so a cookie set by `onrender.com` is a **third-party cookie** on a `vercel.app` page. Our cookies are `SameSite=Lax` ([`auth.controller.js`](src/controllers/auth.controller.js)), and Lax cookies aren't sent on cross-site fetch/XHR requests. Safari/iOS block third-party cookies entirely.
4. **Fix.** A reverse proxy using Vercel rewrites in [`frontend/vercel.json`](frontend/vercel.json):

   ```json
   { "source": "/api/:path*",    "destination": "https://<service>.onrender.com/api/:path*" },
   { "source": "/images/:path*", "destination": "https://<service>.onrender.com/images/:path*" },
   { "source": "/(.*)",          "destination": "/index.html" }
   ```

   - `/api/*` and `/images/*` are forwarded server-side to Render. `:path*` carries the rest of the path, so `/api/v1/auth/login` → `onrender.com/api/v1/auth/login`.
   - Everything else serves `index.html`, so refreshing a deep link like `/projects/123` doesn't 404 (SPA routing).
   - The frontend keeps a **relative** base URL, `VITE_API_BASE_URL=/api/v1` (`frontend/src/lib/http.ts`), never the Render URL.
5. **Result.** The browser only sees `vercel.app`, so the cookie is **first-party**: `SameSite=Lax` works, no CORS is needed, and Safari works. Locally, the Vite dev proxy does the same job.

```
Browser ──► vercel.app/api/v1/auth/login
               │  Vercel forwards it server-side
               ▼
            onrender.com/api/v1/auth/login  ── response + Set-Cookie
               │
Browser ◄── vercel.app   (the cookie now belongs to vercel.app)
```

**Likely follow-ups**

| Question | Answer |
|---|---|
| What was the alternative? | `SameSite=None; Secure` cookies plus CORS with credentials. They'd still be third-party, so Safari blocks them, and CSRF protection gets weaker. |
| What's the trade-off of the rewrite? | Every API call takes an extra hop (Vercel → Render), adding a little latency. For this app that's a small price. |
| What is this pattern called? | A reverse proxy: the client talks to one server, which forwards requests to another behind the scenes. |
| Did you change backend code? | No. It's a config change in `vercel.json`, plus pointing the URL env vars (`CORS_ORIGIN`, `SERVER_URL`, email redirect URLs) at the Vercel domain. |

### 22.6 Bugs I found and fixed (use these as stories)

Structure each story as **situation → problem → how I found it → fix → result**.

1. **Cross-project data access (IDOR).** While reviewing the controllers I noticed tasks and notes were fetched by id only. I scoped every query to the project and verified it with an automated cross-project test that expects 404.
2. **Password hash leak.** "Add member" returned the full user document, including the bcrypt hash and refresh token. I fixed it by selecting only public fields.
3. **Privilege escalation.** A project admin could re-add *themselves* with role `admin`, because the endpoint upserted the role. Now existing members get 409, and only admins can grant admin.
4. **CORS config never loaded.** `dotenv.config()` ran in `index.js` *after* `import app`, but ES module imports are evaluated first, so `app.js` read `process.env` too early. Fix: `import "dotenv/config"` as the very first import.
5. **500 instead of 401 on refresh.** In Express 5, `req.body` is `undefined` when there's no body, so `req.body.refreshToken` crashed. A browser test caught it. Fix: optional chaining.
6. **Broken attachment links.** The URL used `file.originalname`, but multer saved the file as `<timestamp>-<name>`. Fix: use `file.filename`.
7. **Mobile page wider than the screen.** Hidden screen-reader labels (`position:absolute`) inside the horizontally scrolling board escaped its clipping, because their positioned ancestor was outside the scroller. Found by measuring element widths in a headless browser. Fix: `position: relative` on the cards.

### 22.7 Likely questions and short answers

| Question | Answer |
|---|---|
| Why httpOnly cookies and not localStorage? | JavaScript can't read httpOnly cookies, so an XSS bug can't steal the session. localStorage is readable by any script on the page. |
| Doesn't using cookies open you to CSRF? | `SameSite=Lax` stops other sites from sending the cookies on cross-site POST/PUT/DELETE requests, and the API only accepts JSON or multipart bodies. A cross-site setup would need CSRF tokens. |
| Why two tokens? | Short-lived access tokens limit the damage if one leaks. The long-lived refresh token is used rarely, is rotated, and can be revoked in the database. |
| How do you log someone out on the server? | Logout clears the stored refresh token, so it can't create new access tokens. Existing access tokens stay valid until they expire (a known JWT trade-off). |
| Why MongoDB? | Documents map naturally to projects, tasks and notes, and `$lookup` aggregations cover the joins we need. For heavily relational reporting, SQL would be a fair alternative. |
| How are roles enforced? | A `ProjectMember` record per (user, project) holds the role. A middleware checks it on every project route; non-members get 404 so project ids can't be probed. |
| Why 404 instead of 403 for non-members? | It doesn't reveal that the project exists. |
| Why TanStack Query instead of Redux? | The state is server data. TanStack Query gives caching, deduplication, retries and invalidation out of the box, so there's much less code and no duplicate copy of server data. |
| What happens when the access token expires mid-session? | The request returns 401, the interceptor refreshes once and retries, and the user doesn't notice. |
| How do you stop two refresh calls at once? | A shared promise: the first 401 starts the refresh and the others await the same promise. |
| How did you deploy, and what was tricky? | Vercel for the frontend and Render for the API. The tricky part was cookies across two domains, solved with Vercel rewrites so everything is same-origin (full story in section 22.5). See the deployment problems table in section 20. |
| How did you test it? | A committed Vitest suite (55 tests: utilities, validators, auth and validation over HTTP with Supertest, frontend permissions, form validation and error parsing) that GitHub Actions runs on every push and pull request, along with a typecheck and production build. Before that, end-to-end scripts: about 88 API checks (auth, roles, IDOR, uploads, refresh) and 40 browser checks with Playwright, run against a real backend and an in-memory MongoDB, plus a live smoke test. Those aren't in CI yet. |
| What is your CI/CD setup? | CI: GitHub Actions runs backend tests, frontend tests, typecheck and build in two parallel jobs. CD: Vercel and Render deploy every push to `main` automatically. |
| What would you improve next? | Database-backed integration tests in CI, cloud storage for uploads (Render's disk is temporary), rate limiting on login, pagination, and real email delivery with a verified domain. |
| What's the weakest part right now? | Uploads on local disk (lost on Render redeploys), no rate limiting, and email verification isn't enforced. |

### 22.8 Numbers worth remembering

- **3** roles per project: admin, project_admin, member
- **6** collections: users, projects, projectmembers, tasks, subtasks, projectnotes
- **33** API endpoints: auth 10, projects 9, tasks 8, notes 5, health 1
- **3** task statuses: todo, in_progress, done
- Tokens: access **1 day**, refresh **10 days**, email/reset links **20 minutes**
- Uploads: **5 files**, **1 MB** each

### 22.9 A five-minute live demo script

1. Open the live site and **register**. Point out the verification email arriving in Mailtrap, then click the link.
2. **Create a project** and show yourself as admin.
3. In a private window, register a second user. Back in the first window, open **Members** and invite them as **member**.
4. Create two tasks, one with an **attachment** and an **assignee**. **Drag** a card to "In progress".
5. Open a task, **add subtasks** and tick one. Show the counter on the card updating instantly.
6. Switch to the member's window: no "New task" button, no Settings tab, but they **can tick subtasks**. Explain that the backend enforces this; the UI only mirrors it.
7. Open **Notes** and add a note as admin; the member can read it.
8. Shrink the browser to phone width to show the **responsive layout**, then sign out.
