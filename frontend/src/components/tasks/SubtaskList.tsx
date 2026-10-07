import { useState, type FormEvent } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useCreateSubtask, useDeleteSubtask, useToggleSubtask } from "@/hooks/useTasks";
import { toastError } from "@/lib/errors";
import { cn, displayName } from "@/lib/utils";
import type { Subtask } from "@/types";

interface SubtaskListProps {
  projectId: string;
  taskId: string;
  subtasks: Subtask[];
  canToggle: boolean;
  canManage: boolean;
}

export function SubtaskList({ projectId, taskId, subtasks, canToggle, canManage }: SubtaskListProps) {
  const toggle = useToggleSubtask(projectId, taskId);
  const remove = useDeleteSubtask(projectId);
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;
  const percent = subtasks.length ? Math.round((completed / subtasks.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Subtask progress"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {completed}/{subtasks.length}
          </span>
        </div>
      )}

      {subtasks.length === 0 ? (
        <p className="text-sm text-slate-400">
          No subtasks yet.{canManage ? " Break the task into smaller steps below." : ""}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {subtasks.map((subtask) => (
            <li key={subtask._id} className="group flex items-center gap-3 px-3 py-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={subtask.isCompleted}
                aria-label={`Mark "${subtask.title}" as ${subtask.isCompleted ? "not done" : "done"}`}
                disabled={!canToggle}
                onClick={() =>
                  toggle.mutate(
                    { subtaskId: subtask._id, isCompleted: !subtask.isCompleted },
                    { onError: (error) => toastError(error, "Couldn't update the subtask") },
                  )
                }
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed",
                  subtask.isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white hover:border-slate-400",
                )}
              >
                {subtask.isCompleted && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm wrap-break-word", subtask.isCompleted ? "text-slate-400 line-through" : "text-slate-800")}>
                  {subtask.title}
                </p>
                {subtask.createdBy && (
                  <p className="text-xs text-slate-400">Added by {displayName(subtask.createdBy)}</p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="danger-ghost"
                  size="icon-sm"
                  aria-label={`Delete subtask "${subtask.title}"`}
                  className="sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  disabled={remove.isPending && remove.variables === subtask._id}
                  onClick={() =>
                    remove.mutate(subtask._id, {
                      onSuccess: () => toast.success("Subtask deleted"),
                      onError: (error) => toastError(error, "Couldn't delete the subtask"),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && <AddSubtaskForm projectId={projectId} taskId={taskId} />}
    </div>
  );
}

function AddSubtaskForm({ projectId, taskId }: { projectId: string; taskId: string }) {
  const create = useCreateSubtask(projectId, taskId);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setError("Enter a subtask title");
    if (trimmed.length > 200) return setError("Use at most 200 characters");

    create.mutate(trimmed, {
      onSuccess: () => {
        setTitle("");
        setError(undefined);
      },
      onError: (mutationError) => toastError(mutationError, "Couldn't add the subtask"),
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(undefined);
          }}
          placeholder="Add a subtask"
          aria-label="New subtask title"
          invalid={!!error}
          disabled={create.isPending}
        />
        <Button type="submit" variant="secondary" loading={create.isPending}>
          {!create.isPending && <Plus className="size-4" aria-hidden />}
          Add
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
