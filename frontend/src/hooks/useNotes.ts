import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { noteApi } from "@/api/noteApi";
import { queryKeys } from "@/lib/queryClient";

export function useNotes(projectId: string) {
  return useQuery({
    queryKey: queryKeys.notes(projectId),
    queryFn: () => noteApi.list(projectId),
  });
}

function useInvalidateNotes(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.notes(projectId) });
}

export function useCreateNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: (content: string) => noteApi.create(projectId, content),
    onSuccess: invalidate,
  });
}

export function useUpdateNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      noteApi.update(projectId, noteId, content),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(projectId: string) {
  const invalidate = useInvalidateNotes(projectId);
  return useMutation({
    mutationFn: (noteId: string) => noteApi.remove(projectId, noteId),
    onSuccess: invalidate,
  });
}
