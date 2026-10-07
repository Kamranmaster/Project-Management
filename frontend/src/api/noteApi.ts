import { http } from "@/lib/http";
import type { ApiResponse, Note } from "@/types";

export const noteApi = {
  async list(projectId: string) {
    const { data } = await http.get<ApiResponse<Note[]>>(`/notes/${projectId}`);
    return data.data;
  },

  async create(projectId: string, content: string) {
    const { data } = await http.post<ApiResponse<Note>>(`/notes/${projectId}`, { content });
    return data.data;
  },

  async update(projectId: string, noteId: string, content: string) {
    const { data } = await http.put<ApiResponse<Note>>(`/notes/${projectId}/n/${noteId}`, { content });
    return data.data;
  },

  async remove(projectId: string, noteId: string) {
    await http.delete(`/notes/${projectId}/n/${noteId}`);
  },
};
