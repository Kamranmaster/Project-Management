import type { ProjectRole } from "@/types";

/**
 * Mirrors validateProjectPermission(...) in the backend routes exactly.
 * The UI only offers actions the API will accept; the backend still enforces them.
 */
const ALL: ProjectRole[] = ["admin", "project_admin", "member"];
const ADMINS: ProjectRole[] = ["admin", "project_admin"];
const ADMIN_ONLY: ProjectRole[] = ["admin"];

const rules = {
  viewProject: ALL,
  editProject: ADMINS, // PUT /projects/:id
  deleteProject: ADMIN_ONLY, // DELETE /projects/:id
  inviteMember: ADMINS, // POST /projects/:id/members
  manageMembers: ADMIN_ONLY, // PUT / DELETE /projects/:id/members/:userId
  manageTasks: ADMINS, // POST / PUT / DELETE tasks
  manageSubtasks: ADMINS, // create / delete subtasks
  toggleSubtask: ALL, // PUT /tasks/:id/st/:subTaskId
  manageNotes: ADMIN_ONLY, // POST / PUT / DELETE notes
} satisfies Record<string, ProjectRole[]>;

export type Permission = keyof typeof rules;

export function can(role: ProjectRole | undefined, permission: Permission): boolean {
  return !!role && rules[permission].includes(role);
}

/** Roles a user may grant when inviting (only admins can add admins). */
export function invitableRoles(role: ProjectRole | undefined): ProjectRole[] {
  return role === "admin" ? ["member", "project_admin", "admin"] : ["member", "project_admin"];
}

export const ROLE_LABELS: Record<ProjectRole, string> = {
  admin: "Admin",
  project_admin: "Project admin",
  member: "Member",
};

export const ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  admin: "Full control: settings, members, tasks and notes",
  project_admin: "Manage tasks, subtasks and invite members",
  member: "View everything and complete subtasks",
};
