import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AttachmentList } from "@/components/tasks/AttachmentList";
import { SubtaskList } from "@/components/tasks/SubtaskList";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Field";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useDeleteTask, useTask, useUpdateTaskStatus } from "@/hooks/useTasks";
import { toastError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { displayName, formatDateTime, formatRelative, STATUS_LABELS, TASK_STATUSES } from "@/lib/utils";
import type { TaskDetail, TaskStatus, UserSummary } from "@/types";
import { useProjectContext } from "./ProjectLayout";

/** Routed drawer: /projects/:projectId/tasks/:taskId (deep-linkable). */
export function TaskDetailDrawer() {
  const { project } = useProjectContext();
  const { taskId = "" } = useParams();
  const navigate = useNavigate();
  const task = useTask(project._id, taskId);
  const close = () => navigate(`/projects/${project._id}/tasks`);

  const canManage = can(project.role, "manageTasks");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTask = useDeleteTask(project._id);

  const onDelete = () =>
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task deleted");
        setDeleteOpen(false);
        close();
      },
      onError: (error) => toastError(error, "Couldn't delete the task"),
    });

  return (
    <Dialog
      open
      onClose={close}
      variant="drawer"
      title={task.data?.title ?? (task.isError ? "Task" : "Loading task…")}
      headerActions={
        canManage &&
        task.data && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Edit task" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="danger-ghost" size="icon-sm" aria-label="Delete task" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      }
    >
      {task.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ) : task.isError ? (
        <ErrorState error={task.error} onRetry={() => task.refetch()} notFoundTitle="Task not found" />
      ) : (
        <TaskDetailBody task={task.data} />
      )}

      {task.data && (
        <>
          <TaskFormDialog open={editOpen} onClose={() => setEditOpen(false)} projectId={project._id} task={task.data} />
          <ConfirmDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={onDelete}
            loading={deleteTask.isPending}
            title="Delete task?"
            description={
              <>
                <strong className="font-medium text-slate-900">{task.data.title}</strong> and its{" "}
                {task.data.subtasks.length} subtask{task.data.subtasks.length === 1 ? "" : "s"} will be permanently
                deleted.
              </>
            }
            confirmLabel="Delete task"
          />
        </>
      )}
    </Dialog>
  );
}

function TaskDetailBody({ task }: { task: TaskDetail }) {
  const { project } = useProjectContext();
  const canManage = can(project.role, "manageTasks");
  const updateStatus = useUpdateTaskStatus(project._id);

  const onStatusChange = (status: TaskStatus) =>
    updateStatus.mutate(
      { taskId: task._id, status },
      {
        onSuccess: () => toast.success(`Moved to ${STATUS_LABELS[status]}`),
        onError: (error) => toastError(error, "Couldn't change the status"),
      },
    );

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-[7.5rem_1fr] items-center gap-x-4 gap-y-3.5 text-sm">
        <dt className="text-slate-500">Status</dt>
        <dd>
          {canManage ? (
            <Select
              value={task.status}
              onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
              aria-label="Task status"
              className="h-8 w-44"
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          ) : (
            <StatusBadge status={task.status} />
          )}
        </dd>

        <dt className="text-slate-500">Assignee</dt>
        <dd>
          <Person user={task.assignedTo} empty="Unassigned" />
        </dd>

        <dt className="text-slate-500">Created by</dt>
        <dd>
          <Person user={task.assignedBy} empty="Unknown" />
        </dd>

        <dt className="text-slate-500">Created</dt>
        <dd className="text-slate-700" title={formatDateTime(task.createdAt)}>
          {formatDateTime(task.createdAt)}
        </dd>

        <dt className="text-slate-500">Last updated</dt>
        <dd className="text-slate-700" title={formatDateTime(task.updatedAt)}>
          {formatRelative(task.updatedAt)}
        </dd>
      </dl>

      <Section title="Description">
        {task.description?.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-slate-700">{task.description}</p>
        ) : (
          <p className="text-sm text-slate-400">No description.</p>
        )}
      </Section>

      <Section title="Subtasks">
        <SubtaskList
          projectId={project._id}
          taskId={task._id}
          subtasks={task.subtasks}
          canToggle={can(project.role, "toggleSubtask")}
          canManage={can(project.role, "manageSubtasks")}
        />
      </Section>

      <Section title={`Attachments${task.attachements.length ? ` (${task.attachements.length})` : ""}`}>
        <AttachmentList attachments={task.attachements} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Person({ user, empty }: { user?: UserSummary | null; empty: string }) {
  if (!user) return <span className="text-slate-400">{empty}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar user={user} size="xs" />
      <span className="font-medium text-slate-800">{displayName(user)}</span>
    </span>
  );
}
