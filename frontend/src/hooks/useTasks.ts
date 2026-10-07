import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskApi, type TaskInput } from "@/api/taskApi";
import { queryKeys } from "@/lib/queryClient";
import type { Task, TaskDetail, TaskStatus } from "@/types";

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => taskApi.list(projectId),
  });
}

export function useTask(projectId: string, taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.task(projectId, taskId ?? ""),
    queryFn: () => taskApi.get(projectId, taskId!),
    enabled: !!taskId,
  });
}

/** Invalidates the board and every cached task detail of the project. */
function useInvalidateTasks(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
}

export function useCreateTask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: (input: TaskInput) => taskApi.create(projectId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: TaskInput }) =>
      taskApi.update(projectId, taskId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => taskApi.remove(projectId, taskId),
    // Only the board is refreshed; the deleted task's detail query is left to be
    // garbage-collected so the open drawer doesn't refetch a 404 while closing.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId), exact: true }),
  });
}

/** Optimistic: the card moves column immediately and rolls back if the API rejects it. */
export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.tasks(projectId);

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      taskApi.updateStatus(projectId, taskId, status),
    onMutate: async ({ taskId, status }) => {
      const detailKey = queryKeys.task(projectId, taskId);
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<Task[]>(listKey);
      const previousDetail = queryClient.getQueryData<TaskDetail>(detailKey);

      queryClient.setQueryData<Task[]>(listKey, (tasks) =>
        tasks?.map((task) => (task._id === taskId ? { ...task, status } : task)),
      );
      queryClient.setQueryData<TaskDetail>(detailKey, (task) => (task ? { ...task, status } : task));

      return { previousList, previousDetail, detailKey };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(listKey, context.previousList);
      queryClient.setQueryData(context.detailKey, context.previousDetail);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

export function useCreateSubtask(projectId: string, taskId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: (title: string) => taskApi.createSubtask(projectId, taskId, title),
    onSuccess: invalidate,
  });
}

/**
 * Optimistic subtask completion. Safe because the toggle is idempotent and
 * allowed for every project role; on failure both caches are restored.
 */
export function useToggleSubtask(projectId: string, taskId: string) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.tasks(projectId);
  const detailKey = queryKeys.task(projectId, taskId);

  return useMutation({
    mutationFn: ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) =>
      taskApi.updateSubtask(projectId, subtaskId, { isCompleted }),
    onMutate: async ({ subtaskId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<TaskDetail>(detailKey);
      const previousList = queryClient.getQueryData<Task[]>(listKey);

      queryClient.setQueryData<TaskDetail>(detailKey, (task) =>
        task
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask._id === subtaskId ? { ...subtask, isCompleted } : subtask,
              ),
            }
          : task,
      );
      queryClient.setQueryData<Task[]>(listKey, (tasks) =>
        tasks?.map((task) =>
          task._id === taskId
            ? { ...task, completedSubtaskCount: task.completedSubtaskCount + (isCompleted ? 1 : -1) }
            : task,
        ),
      );

      return { previousDetail, previousList };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(detailKey, context?.previousDetail);
      queryClient.setQueryData(listKey, context?.previousList);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

export function useDeleteSubtask(projectId: string) {
  const invalidate = useInvalidateTasks(projectId);
  return useMutation({
    mutationFn: (subtaskId: string) => taskApi.removeSubtask(projectId, subtaskId),
    onSuccess: invalidate,
  });
}
