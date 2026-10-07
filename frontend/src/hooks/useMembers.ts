import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memberApi } from "@/api/memberApi";
import { queryKeys } from "@/lib/queryClient";
import type { ProjectRole } from "@/types";

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.members(projectId),
    queryFn: () => memberApi.list(projectId),
  });
}

/** Membership changes affect the member list and the member count on project cards. */
function useInvalidateMembers(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.members(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
    ]);
}

export function useInviteMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId);
  return useMutation({
    mutationFn: (input: { email: string; role: ProjectRole }) => memberApi.add(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateMemberRole(projectId: string) {
  const invalidate = useInvalidateMembers(projectId);
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: ProjectRole }) =>
      memberApi.updateRole(projectId, userId, role),
    onSuccess: invalidate,
  });
}

export function useRemoveMember(projectId: string) {
  const invalidate = useInvalidateMembers(projectId);
  return useMutation({
    mutationFn: (userId: string) => memberApi.remove(projectId, userId),
    onSuccess: invalidate,
  });
}
