import { http } from "@/lib/http";
import type { ApiResponse, ProjectMember, ProjectRole, UserSummary } from "@/types";

export const memberApi = {
  async list(projectId: string) {
    const { data } = await http.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`);
    return data.data;
  },

  /** Invitations are by exact email of an existing account (no user search API exists). */
  async add(projectId: string, input: { email: string; role: ProjectRole }) {
    const { data } = await http.post<ApiResponse<UserSummary>>(`/projects/${projectId}/members`, input);
    return data.data;
  },

  async updateRole(projectId: string, userId: string, newRole: ProjectRole) {
    await http.put(`/projects/${projectId}/members/${userId}`, { newRole });
  },

  async remove(projectId: string, userId: string) {
    await http.delete(`/projects/${projectId}/members/${userId}`);
  },
};
