import { describe, expect, it } from "vitest";
import { can, invitableRoles } from "./permissions";

describe("can", () => {
  it("lets every member view the project and toggle subtasks", () => {
    for (const role of ["admin", "project_admin", "member"] as const) {
      expect(can(role, "viewProject")).toBe(true);
      expect(can(role, "toggleSubtask")).toBe(true);
    }
  });

  it("lets admins and project admins manage tasks, but not members", () => {
    expect(can("admin", "manageTasks")).toBe(true);
    expect(can("project_admin", "manageTasks")).toBe(true);
    expect(can("member", "manageTasks")).toBe(false);
  });

  it("keeps deleting projects and managing notes admin-only", () => {
    expect(can("admin", "deleteProject")).toBe(true);
    expect(can("project_admin", "deleteProject")).toBe(false);
    expect(can("project_admin", "manageNotes")).toBe(false);
  });

  it("denies everything when the role is unknown", () => {
    expect(can(undefined, "viewProject")).toBe(false);
  });
});

describe("invitableRoles", () => {
  it("only lets admins invite other admins", () => {
    expect(invitableRoles("admin")).toContain("admin");
    expect(invitableRoles("project_admin")).not.toContain("admin");
    expect(invitableRoles("project_admin")).toEqual(["member", "project_admin"]);
  });
});
