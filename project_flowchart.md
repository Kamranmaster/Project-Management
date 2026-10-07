# Project Camp — Architecture & Flow Diagrams

> Every diagram reflects the code in this repository: Express backend in `src/`, React frontend in `frontend/src/`.
> Mermaid renders on GitHub and in most Markdown previewers.

**Contents**

1. [Overall system architecture](#1-overall-system-architecture)
2. [Frontend execution flow](#2-frontend-execution-flow)
3. [Authentication flow (register, verify, login, reset)](#3-authentication-flow)
4. [Silent refresh flow](#4-silent-refresh-flow)
5. [Project flow](#5-project-flow)
6. [Task creation flow](#6-task-creation-flow)
7. [Task update flow (status / edit)](#7-task-update-flow)
8. [Subtask flow](#8-subtask-flow)
9. [Notes flow](#9-notes-flow)
10. [Members / invitation flow](#10-members--invitation-flow)
11. [Logout flow](#11-logout-flow)
12. [Backend middleware pipeline](#12-backend-middleware-pipeline)
13. [Data model](#13-data-model)
14. [Token & security architecture](#14-token--security-architecture)
15. [Key talking points](#15-key-talking-points)

---

## 1. Overall system architecture

```mermaid
graph TB
    User(["User (browser)"])

    subgraph Frontend["React SPA — frontend/ (Vite, :5173)"]
        Router["React Router<br/>routes/guards.tsx"]
        Pages["Pages & components"]
        Hooks["TanStack Query hooks<br/>hooks/*"]
        Cache[("Query cache")]
        ApiLayer["API layer<br/>api/*Api.ts"]
        Http["Axios instance + 401 refresh interceptor<br/>lib/http.ts"]
    end

    subgraph Backend["Express 5 API — src/ (:8000)"]
        MW["json · urlencoded · static(/public) · cookieParser · CORS"]
        Routes["/api/v1/{auth, projects, tasks, notes, healthcheck}"]
        Guards["verifyJWT → validateProjectPermission(roles)<br/>multer · express-validator"]
        Controllers["Controllers (business logic)"]
        ErrorHandler["Global error handler"]
    end

    Mongo[("MongoDB<br/>users · projects · projectmembers<br/>tasks · subtasks · projectnotes")]
    Disk[("public/images<br/>task attachments")]
    Mail["Mailtrap SMTP<br/>verification & reset emails"]

    User --> Router --> Pages --> Hooks
    Hooks <--> Cache
    Hooks --> ApiLayer --> Http
    Http -- "HTTP + httpOnly cookies<br/>(dev: Vite proxy /api, /images)" --> MW
    MW --> Routes --> Guards --> Controllers
    Controllers --> Mongo
    Controllers --> Disk
    Controllers --> Mail
    Controllers -. "throw ApiError" .-> ErrorHandler
    Controllers -- "ApiResponse {statusCode, data, message, success}" --> Http
    ErrorHandler -- "{success:false, message, errors[]}" --> Http
```

---

## 2. Frontend execution flow

```mermaid
flowchart TD
    Start["main.tsx"] --> Init["Create QueryClient · register session-expired handler<br/>render QueryClientProvider + RouterProvider + Toaster"]
    Init --> Match{"Which route?"}

    Match -->|"/login, /register, /forgot-password"| PublicOnly["PublicOnlyRoute"]
    Match -->|"/reset-password/:token, /verify-email/:token"| Open["Public page (works signed in or out)"]
    Match -->|"/, /projects/**, /account"| Protected["ProtectedRoute"]
    Match -->|"anything else"| NotFound["NotFoundPage"]

    Protected --> Me["useCurrentUser()<br/>POST /auth/current-user"]
    PublicOnly --> Me
    Me -->|"pending"| Spinner["Full-page spinner"]
    Me -->|"401 → interceptor refresh fails → null"| NoUser["user = null"]
    Me -->|"200"| HasUser["user cached under ['auth','me']"]
    Me -->|"network / 5xx"| BootError["ErrorState + Retry"]

    NoUser -->|"protected route"| ToLogin["Navigate /login (state.from = current URL)"]
    HasUser -->|"public-only route"| ToFrom["Navigate to state.from or /projects"]
    HasUser -->|"protected route"| Layout["AppLayout: Sidebar (GET /projects) · Topbar · verification banner"]

    Layout --> Page["Page mounts → useQuery(key)"]
    Page --> Loading["Skeletons"]
    Loading --> Resp{"Response"}
    Resp -->|"2xx, empty"| Empty["EmptyState (+ CTA if role allows)"]
    Resp -->|"2xx, data"| Render["Render data"]
    Resp -->|"400/404"| NF["Not-found state"]
    Resp -->|"403"| Denied["Access-denied state"]
    Resp -->|"5xx / network"| Retry["ErrorState + Retry (auto-retried twice first)"]

    Render --> Action["User action (form, drag, checkbox)"]
    Action --> Validate["Zod validation (client)"]
    Validate --> Mutation["useMutation → api/* → Axios"]
    Mutation -->|"success"| Invalidate["invalidateQueries / setQueryData → re-render · toast"]
    Mutation -->|"422"| Fields["errors[] mapped onto form fields"]
    Mutation -->|"409 / 404 / 400"| FieldOrRoot["Field error or form alert"]
    Mutation -->|"403 / 5xx"| Toast["Error toast (optimistic changes rolled back)"]
    Invalidate --> Page
```

---

## 3. Authentication flow

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as React (Register/Login pages)
    participant API as Express /api/v1/auth
    participant DB as MongoDB
    participant M as Mailtrap

    Note over U,M: Registration
    U->>FE: Fill RegisterPage (fullname, username, email, password)
    FE->>FE: Zod: email, lowercase username ≥3, password ≥8, confirm match
    FE->>API: POST /register
    API->>API: userRegisterValidator → validate (422 on failure)
    API->>DB: findOne({username} or {email}) → 409 if exists
    API->>DB: User.create (bcrypt pre-save hook) + hashed verification token (20 min)
    API->>M: Email link EMAIL_VERIFICATION_REDIRECT_URL/<token>
    API-->>FE: 201 {user}
    FE-->>U: "Check your inbox"

    Note over U,M: Email verification
    U->>FE: Opens /verify-email/:token
    FE->>API: GET /verify-email/:token (useQuery, never retried — tokens are single-use)
    API->>DB: find by sha256(token) and expiry > now
    API-->>FE: 200 {isEmailVerified:true} or 400 "Token is invalid or Expired"
    FE->>FE: invalidate ['auth','me'] so the banner disappears

    Note over U,M: Login
    U->>FE: LoginPage (email, password)
    FE->>API: POST /login
    API->>DB: findOne({email}) → bcrypt.compare
    API->>DB: store new refreshToken on user
    API-->>FE: 200 {user} + Set-Cookie accessToken, refreshToken (httpOnly, SameSite=Lax)
    FE->>FE: resetSession(): drop cached data, setQueryData(['auth','me'], user)
    FE-->>U: PublicOnlyRoute redirects to state.from or /projects

    Note over U,M: Forgot / reset password
    U->>FE: ForgotPasswordPage (email)
    FE->>API: POST /forgot-password
    API->>M: Email link FORGOT_PASSWORD_REDIRECT_URL/<token>
    U->>FE: Opens /reset-password/:token, enters new password
    FE->>API: POST /reset-password/:token {newPassword}
    API-->>FE: 200 → toast + navigate /login  |  400 → "Request a new link"
```

---

## 4. Silent refresh flow

```mermaid
flowchart TD
    Req["Any API request (http instance)"] --> Res{"Response status"}
    Res -->|"not 401"| Done["Resolve / reject normally"]
    Res -->|"401"| Check{"Auth endpoint (login, register, refresh-token,<br/>forgot/reset, verify, logout)<br/>or already retried?"}
    Check -->|"yes"| Reject["Reject — caller shows its own error"]
    Check -->|"no"| Mark["original._retry = true"]
    Mark --> InFlight{"refreshPromise already pending?"}
    InFlight -->|"yes"| Wait["Await the same promise (single-flight)"]
    InFlight -->|"no"| Refresh["refreshClient.post('/auth/refresh-token')<br/>(separate Axios instance, no interceptors)"]
    Refresh --> Server["Backend: verify refresh JWT, compare with user.refreshToken,<br/>rotate both tokens, Set-Cookie"]
    Server --> Outcome{"Refresh result"}
    Wait --> Outcome
    Outcome -->|"200"| Replay["Replay original request with new cookies"]
    Outcome -->|"401"| Expired["onSessionExpired(): resetSession(null)<br/>toast 'Your session has expired' if a user was signed in"]
    Expired --> Guard["ProtectedRoute sees user = null → /login (state.from kept)"]
```

> Single-flight matters because the backend **rotates** refresh tokens: two parallel refreshes would send the
> same token twice, and the second would fail and log the user out.

---

## 5. Project flow

```mermaid
flowchart TD
    A["ProjectsPage / Sidebar"] -->|"useProjects()"| B["GET /projects"]
    B --> C["Aggregation: ProjectMember(user) → $lookup projects → member count"]
    C --> D["[{projects:{…, members}, role}] → normalised to ProjectSummary[]"]
    D --> E["Project cards + sidebar list (role badge)"]

    E -->|"New project"| F["ProjectFormDialog (Zod: name 1–80, description ≤500)"]
    F --> G["POST /projects"]
    G --> H{"Result"}
    H -->|"200"| I["Project.create + ProjectMember(role: admin)<br/>invalidate ['projects'] → navigate /projects/:id/tasks"]
    H -->|"409 duplicate name"| J["Error on the name field"]

    E -->|"Open"| K["ProjectLayout: useProject(id) → GET /projects/:id"]
    K -->|"200 {…project, role}"| L["Header + tabs (Settings only if admin/project_admin)<br/>Outlet context: { project }"]
    K -->|"404 not a member / 400 bad id"| M["'Project not found' state"]

    L -->|"Settings: save"| N["PUT /projects/:id (admin, project_admin) → invalidate list + detail"]
    L -->|"Settings: delete (admin)"| O["Type-to-confirm → DELETE /projects/:id"]
    O --> P["Backend cascades: members, tasks, subtasks, notes"]
    P --> Q["invalidate ['projects'] → navigate /projects"]
```

---

## 6. Task creation flow

```mermaid
sequenceDiagram
    autonumber
    actor U as Admin / Project admin
    participant TB as TasksPage / TaskBoard
    participant D as TaskFormDialog
    participant Q as TanStack Query
    participant API as Express
    participant FS as public/images
    participant DB as MongoDB

    U->>TB: "New task" (or "+" on a column → preset status)
    TB->>D: open (button only rendered if can(role, 'manageTasks'))
    D->>Q: useMembers(projectId) → GET /projects/:id/members (assignee options)
    U->>D: title, description, assignee, status, files (≤5, ≤1 MB each)
    D->>D: Zod validation + FilePicker limits
    D->>API: POST /tasks/:projectId (multipart FormData, files under "attachements")
    API->>API: verifyJWT → validateProjectPermission([admin, project_admin])
    API->>FS: multer saves <timestamp>-<name>
    API->>API: createTaskValidator → validate
    API->>DB: assignee must be a ProjectMember (else 400) · status must be valid (else 400)
    API->>DB: Task.create({…, assignedBy: req.user, attachements:[{url, mimeType, size}]})
    API-->>D: 201 task
    D->>Q: invalidate ['projects', id, 'tasks']
    Q->>API: GET /tasks/:projectId (assignee populated + subtask counts)
    Q-->>TB: board re-renders · toast "Task created"
```

---

## 7. Task update flow

```mermaid
flowchart TD
    subgraph StatusChange["Status change (drag & drop on board or Status select in drawer)"]
        S1["onDrop / onChange (admin, project_admin only)"] --> S2["onMutate: cancel queries, snapshot,<br/>optimistically set status in list + detail caches"]
        S2 --> S3["PUT /tasks/:projectId/t/:taskId {status}"]
        S3 --> S4{"Response"}
        S4 -->|"200"| S5["Toast · invalidate tasks"]
        S4 -->|"error"| S6["Restore snapshots · error toast"]
    end

    subgraph Edit["Edit task (drawer → pencil)"]
        E1["TaskFormDialog prefilled from TaskDetail"] --> E2["PUT multipart: title, description,<br/>assignedTo ('' = unassign), status, new files"]
        E2 --> E3["Backend: task looked up by {_id, project} (404 if other project)<br/>assignee membership + status validated · new files appended"]
        E3 --> E4["invalidate ['projects', id, 'tasks'] (board + detail)"]
    end

    subgraph Delete["Delete task"]
        D1["ConfirmDialog"] --> D2["DELETE /tasks/:projectId/t/:taskId"]
        D2 --> D3["Backend deletes task {_id, project} + its subtasks"]
        D3 --> D4["Invalidate board · close drawer"]
    end
```

---

## 8. Subtask flow

```mermaid
flowchart TD
    Drawer["TaskDetailDrawer: GET /tasks/:projectId/t/:taskId<br/>(task + assignedTo + assignedBy + subtasks[] with createdBy)"]

    Drawer --> Add["Add subtask (admin, project_admin)"]
    Add --> AddReq["POST /tasks/:projectId/t/:taskId/subtasks {title}"]
    AddReq --> AddCheck["Backend: task must belong to :projectId"]
    AddCheck --> Inv["invalidate tasks → drawer + card counts update"]

    Drawer --> Toggle["Toggle checkbox (every role)"]
    Toggle --> Opt["Optimistic: flip isCompleted in detail cache,<br/>±1 completedSubtaskCount on the board card"]
    Opt --> ToggleReq["PUT /tasks/:projectId/st/:subTaskId {isCompleted}"]
    ToggleReq --> ToggleCheck["Backend: subtask → parent task must belong to :projectId (else 404)"]
    ToggleCheck -->|"200"| Settle["invalidate tasks"]
    ToggleCheck -->|"error"| Rollback["Restore both caches · error toast"]

    Drawer --> Del["Delete subtask (admin, project_admin)"]
    Del --> DelReq["DELETE /tasks/:projectId/st/:subTaskId"]
    DelReq --> Inv
```

---

## 9. Notes flow

```mermaid
flowchart TD
    N1["NotesPage: useNotes(id) → GET /notes/:projectId<br/>(newest first, createdBy populated) — every role"] --> N2{"Data"}
    N2 -->|"[]"| N3["EmptyState (CTA only for admin)"]
    N2 -->|"notes"| N4["NoteCard list (author, relative time, 'edited')"]

    N4 -->|"admin: New note"| C1["NoteFormDialog (Zod 1–10,000 chars)"] --> C2["POST /notes/:projectId {content}"]
    N4 -->|"admin: Edit"| U1["NoteFormDialog prefilled"] --> U2["PUT /notes/:projectId/n/:noteId"]
    N4 -->|"admin: Delete"| D1["ConfirmDialog"] --> D2["DELETE /notes/:projectId/n/:noteId"]

    C2 & U2 & D2 --> B["Backend: validateProjectPermission([admin])<br/>note looked up by {_id, project} (404 across projects)"]
    B --> R["invalidate ['projects', id, 'notes'] · toast"]
```

---

## 10. Members / invitation flow

```mermaid
flowchart TD
    M1["MembersPage: GET /projects/:id/members (any member; non-members get 404)"] --> M2["Rows: avatar, name, @username, email, role, joined"]

    M2 -->|"admin / project_admin: Add member"| I1["InviteMemberDialog: email + role<br/>(project_admin cannot pick 'admin')"]
    I1 --> I2["POST /projects/:id/members {email, role}"]
    I2 --> I3{"Backend"}
    I3 -->|"403"| I4["project_admin tried to grant admin"]
    I3 -->|"404"| I5["'No Project Camp account uses this email'"]
    I3 -->|"409"| I6["'Already a member'"]
    I3 -->|"201 (sanitised user)"| I7["invalidate members + projects (count) · toast"]

    M2 -->|"admin: role select"| R1["PUT /projects/:id/members/:userId {newRole}"]
    M2 -->|"admin: remove"| X1["ConfirmDialog → DELETE /projects/:id/members/:userId"]
    R1 & X1 --> G["Backend guard: the last admin can't be demoted or removed (400)"]
    G --> I7

    M2 -.->|"members list also feeds"| A["Assignee select in TaskFormDialog"]
```

---

## 11. Logout flow

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Topbar menu / AccountPage
    participant Q as Query cache
    participant API as Express
    participant DB as MongoDB

    U->>FE: Sign out
    FE->>API: POST /auth/logout
    API->>DB: user.refreshToken = ""
    API-->>FE: 200 + clearCookie(accessToken, refreshToken)
    FE->>Q: onSettled → resetSession(null): remove all project data, me = null
    Note over FE: Runs even if the request failed, so the local session always ends
    FE-->>U: ProtectedRoute → /login
```

---

## 12. Backend middleware pipeline

```mermaid
graph LR
    A["Request"] --> B["express.json (16kb) · urlencoded"]
    B --> C["express.static('public') → /images/*"]
    C --> D["cookieParser · CORS (CORS_ORIGIN, credentials)"]
    D --> E["Router"]
    E --> F{"Secured?"}
    F -->|"yes"| G["verifyJWT: cookie or Bearer → req.user"]
    G --> H{"Project route?"}
    H -->|"yes"| I["validateProjectPermission(roles)<br/>404 not a member · 403 wrong role · sets req.user.role"]
    H -->|"no"| J
    I --> J["multer (tasks) → express-validator → validate (422)"]
    F -->|"no"| J
    J --> K["Controller (asyncHandler)"]
    K -->|"ok"| L["ApiResponse"]
    K -->|"throw"| M["Error handler: ApiError status ·<br/>BSON/CastError → 400 · E11000 → 409 · Multer → 400 · else 500"]
```

---

## 13. Data model

```mermaid
erDiagram
    USER ||--o{ PROJECT_MEMBER : "belongs to"
    PROJECT ||--o{ PROJECT_MEMBER : "has"
    PROJECT ||--o{ TASK : "contains"
    PROJECT ||--o{ PROJECT_NOTE : "contains"
    TASK ||--o{ SUBTASK : "has"
    USER ||--o{ TASK : "assignedTo / assignedBy"
    USER ||--o{ PROJECT_NOTE : "createdBy"
    USER ||--o{ SUBTASK : "createdBy"

    USER {
        ObjectId _id
        string username "unique, lowercase"
        string email
        string FullName
        string password "bcrypt"
        object avatar "url, localPath"
        boolean isEmailVerified
        string refreshToken
        string emailVerificationToken "sha256, 20 min"
        string forgotPasswordToken "sha256, 20 min"
    }
    PROJECT {
        ObjectId _id
        string name "unique"
        string description
        ObjectId createdBy
    }
    PROJECT_MEMBER {
        ObjectId user
        ObjectId project
        string role "admin | project_admin | member"
    }
    TASK {
        ObjectId _id
        string title
        string description
        ObjectId project
        ObjectId assignedTo
        ObjectId assignedBy
        string status "todo | in_progress | done"
        array attachements "url, mimeType, size"
    }
    SUBTASK {
        ObjectId _id
        string title
        ObjectId task
        boolean isCompleted
        ObjectId createdBy
    }
    PROJECT_NOTE {
        ObjectId _id
        ObjectId project
        ObjectId createdBy
        string content
    }
```

---

## 14. Token & security architecture

```mermaid
graph TD
    AT["Access token (JWT {_id, email})<br/>ACCESS_TOKEN_EXPIRY"] --> C1["httpOnly cookie · Secure in production · SameSite=Lax"]
    RT["Refresh token (JWT {_id})<br/>REFRESH_TOKEN_EXPIRY"] --> C1
    RT --> DBRT["Also stored on the user → enables rotation & logout invalidation"]
    TT["Temporary token: crypto.randomBytes(20)"] --> TT1["Email link carries the raw token"]
    TT --> TT2["DB stores sha256(token) + 20 min expiry"]
    PW["Passwords"] --> PW1["bcrypt (10 rounds) in pre-save hook"]
    FE["Frontend"] --> FE1["Never reads or stores tokens (no localStorage)<br/>withCredentials + single-flight refresh"]
```

---

## 15. Key talking points

| Topic | Summary |
|---|---|
| **Architecture** | React SPA (Vite, TypeScript) → Axios → Express 5 REST API → MongoDB via Mongoose. In development the Vite proxy makes the API same-origin. |
| **Server state** | TanStack Query owns all server data: per-project cache keys, targeted invalidation, optimistic updates with rollback for status moves and subtask toggles. |
| **Authentication** | JWT access and refresh tokens in httpOnly cookies, refresh-token rotation, and a single-flight 401 → refresh → retry interceptor on the client. |
| **Authorization** | Per-project roles stored on `ProjectMember` and enforced by `validateProjectPermission`. The UI mirrors the same matrix (`lib/permissions.ts`), so users never see controls the API would reject. |
| **Data isolation** | Every task, subtask and note lookup is scoped to `:projectId`, so membership in one project can't reach another project's data (IDOR fix). |
| **Validation** | Zod on the client and express-validator on the server. Server 422 errors are mapped back onto the form fields. |
| **Error handling** | `ApiError` + `asyncHandler` + a global handler on the server. On the client, each status has its own UI: field errors, not-found, access denied, retry. |
| **Aggregation** | `$lookup` pipelines for project lists with member counts and task detail with populated users and subtasks. A `$group` adds subtask progress to the task board. |
