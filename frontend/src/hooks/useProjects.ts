import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectApi, type ProjectInput } from "@/api/projectApi";
import { queryKeys } from "@/lib/queryClient";

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: projectApi.list });
}

/** Project details plus the current user's role in it. */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ""),
    queryFn: () => projectApi.get(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectApi.update(projectId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId), exact: true }),
      ]),
  });
}

export function useDeleteProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => projectApi.remove(projectId),
    // The deleted project's own queries are not removed here: its page is still
    // mounted and would refetch (404) before the caller navigates away. They are
    // unobserved after navigation and garbage-collected by TanStack Query.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
  });
}
