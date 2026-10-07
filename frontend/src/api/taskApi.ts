import { http } from "@/lib/http";
import type { ApiResponse, Subtask, Task, TaskDetail, TaskStatus } from "@/types";

export interface TaskInput {
  title: string;
  description: string;
  /** User id, or "" for unassigned. */
  assignedTo: string;
  status: TaskStatus;
  files: File[];
}

/** Task create/update accept multipart so attachments can be sent in the same request. */
function toFormData(input: TaskInput) {
  const form = new FormData();
  form.append("title", input.title);
  form.append("description", input.description);
  form.append("assignedTo", input.assignedTo);
  form.append("status", input.status);
  // The backend field name is spelled "attachements".
  input.files.forEach((file) => form.append("attachements", file));
  return form;
}

export const taskApi = {
  async list(projectId: string) {
    const { data } = await http.get<ApiResponse<Task[]>>(`/tasks/${projectId}`);
    return data.data;
  },

  async get(projectId: string, taskId: string) {
    const { data } = await http.get<ApiResponse<TaskDetail>>(`/tasks/${projectId}/t/${taskId}`);
    return data.data;
  },

  async create(projectId: string, input: TaskInput) {
    const { data } = await http.post<ApiResponse<Task>>(`/tasks/${projectId}`, toFormData(input));
    return data.data;
  },

  async update(projectId: string, taskId: string, input: TaskInput) {
    const { data } = await http.put<ApiResponse<Task>>(
      `/tasks/${projectId}/t/${taskId}`,
      toFormData(input),
    );
    return data.data;
  },

  async updateStatus(projectId: string, taskId: string, status: TaskStatus) {
    const { data } = await http.put<ApiResponse<Task>>(`/tasks/${projectId}/t/${taskId}`, { status });
    return data.data;
  },

  async remove(projectId: string, taskId: string) {
    await http.delete(`/tasks/${projectId}/t/${taskId}`);
  },

  async createSubtask(projectId: string, taskId: string, title: string) {
    const { data } = await http.post<ApiResponse<Subtask>>(
      `/tasks/${projectId}/t/${taskId}/subtasks`,
      { title },
    );
    return data.data;
  },

  async updateSubtask(projectId: string, subtaskId: string, input: { title?: string; isCompleted?: boolean }) {
    const { data } = await http.put<ApiResponse<Subtask>>(`/tasks/${projectId}/st/${subtaskId}`, input);
    return data.data;
  },

  async removeSubtask(projectId: string, subtaskId: string) {
    await http.delete(`/tasks/${projectId}/st/${subtaskId}`);
  },
};
