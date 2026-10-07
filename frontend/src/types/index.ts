// Types mirror the backend Mongoose models and controller responses exactly.
// Field names (including `FullName` and `attachements`) match the API as-is.

export type ProjectRole = "admin" | "project_admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface Avatar {
  url: string;
  localPath: string;
}

/** Full user as returned by login / current-user. */
export interface User {
  _id: string;
  username: string;
  email: string;
  FullName?: string;
  avatar: Avatar;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Populated user reference inside other documents. */
export interface UserSummary {
  _id: string;
  username: string;
  FullName?: string;
  email?: string;
  avatar?: Avatar;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

/** Item of GET /projects, normalised by the API layer. */
export interface ProjectSummary extends Project {
  members: number;
  role: ProjectRole;
}

/** GET /projects/:projectId — includes the caller's role in the project. */
export interface ProjectDetail extends Project {
  role: ProjectRole;
}

export interface ProjectMember {
  project: string;
  /** Undefined only if the user account was deleted. */
  user?: UserSummary;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  _id?: string;
  url: string;
  /** Missing on attachments uploaded before the backend fix. */
  mimeType?: string;
  size: number;
}

/** Item of GET /tasks/:projectId */
export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: string;
  assignedTo?: UserSummary | null;
  assignedBy?: string;
  status: TaskStatus;
  attachements: Attachment[];
  subtaskCount: number;
  completedSubtaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  _id: string;
  title: string;
  task: string;
  isCompleted: boolean;
  createdBy?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

/** GET /tasks/:projectId/t/:taskId */
export interface TaskDetail extends Omit<Task, "assignedBy" | "subtaskCount" | "completedSubtaskCount"> {
  assignedBy?: UserSummary;
  subtasks: Subtask[];
}

export interface Note {
  _id: string;
  project: string;
  createdBy?: UserSummary;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Success envelope produced by the backend's ApiResponse class. */
export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  /** Some controllers send an object here, so never render it directly. */
  message: string | { message: string };
  success: boolean;
}

/** Error envelope produced by the global Express error handler. */
export interface ApiErrorBody {
  success: false;
  message: string;
  /** express-validator errors: one { field: message } object per error. */
  errors: Array<Record<string, string>>;
}
