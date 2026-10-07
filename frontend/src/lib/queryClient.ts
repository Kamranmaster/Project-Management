import { QueryClient } from "@tanstack/react-query";
import { parseApiError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Retry only transient failures (network / 5xx), never 4xx.
      retry: (failureCount, error) => {
        const { status } = parseApiError(error);
        return (status === undefined || status >= 500) && failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

/**
 * Cache keys. Everything belonging to a project lives under ["projects", id]
 * so a project's data can be invalidated or removed with one prefix.
 */
export const queryKeys = {
  me: ["auth", "me"] as const,
  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId] as const,
  members: (projectId: string) => ["projects", projectId, "members"] as const,
  tasks: (projectId: string) => ["projects", projectId, "tasks"] as const,
  task: (projectId: string, taskId: string) => ["projects", projectId, "tasks", taskId] as const,
  notes: (projectId: string) => ["projects", projectId, "notes"] as const,
};
