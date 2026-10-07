import { http } from "@/lib/http";
import type { ApiResponse, Project, ProjectDetail, ProjectRole, ProjectSummary } from "@/types";

export interface ProjectInput {
  name: string;
  description?: string;
}

/** Raw shape of GET /projects items (the aggregation nests the project under `projects`). */
interface ProjectListItem {
  projects: Omit<ProjectSummary, "role">;
  role: ProjectRole;
}

export const projectApi = {
  async list(): Promise<ProjectSummary[]> {
    const { data } = await http.get<ApiResponse<ProjectListItem[]>>("/projects");
    return data.data
      .map(({ projects, role }) => ({ ...projects, role }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(projectId: string) {
    const { data } = await http.get<ApiResponse<ProjectDetail>>(`/projects/${projectId}`);
    return data.data;
  },

  async create(input: ProjectInput) {
    const { data } = await http.post<ApiResponse<Project>>("/projects", input);
    return data.data;
  },

  async update(projectId: string, input: ProjectInput) {
    const { data } = await http.put<ApiResponse<Project>>(`/projects/${projectId}`, input);
    return data.data;
  },

  async remove(projectId: string) {
    await http.delete(`/projects/${projectId}`);
  },
};
