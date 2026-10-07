import { useState } from "react";
import { Plus } from "lucide-react";
import { STATUS_DOT } from "@/components/ui/Badge";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import { toastError } from "@/lib/errors";
import { cn, STATUS_LABELS, TASK_STATUSES } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";

interface TaskBoardProps {
  projectId: string;
  tasks: Task[];
  /** admin / project_admin: may drag cards between columns and add tasks. */
  canManage: boolean;
  onAddTask: (status: TaskStatus) => void;
}

export function TaskBoard({ projectId, tasks, canManage, onAddTask }: TaskBoardProps) {
  const updateStatus = useUpdateTaskStatus(projectId);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  const moveTask = (taskId: string, status: TaskStatus) => {
    const task = tasks.find((candidate) => candidate._id === taskId);
    if (!task || task.status === status) return;
    updateStatus.mutate(
      { taskId, status },
      { onError: (error) => toastError(error, `Couldn't move "${task.title}"`) },
    );
  };

  return (
    // Columns scroll horizontally (with snapping) on small screens.
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-thin sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        const isTarget = dropTarget === status && draggedTaskId !== null;

        return (
          <section
            key={status}
            aria-labelledby={`column-${status}`}
            onDragOver={(event) => {
              if (!canManage || !draggedTaskId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget(status);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const taskId = event.dataTransfer.getData("text/plain");
              setDropTarget(null);
              setDraggedTaskId(null);
              if (canManage && taskId) moveTask(taskId, status);
            }}
            className={cn(
              "relative flex w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-2xl border bg-slate-100/70 transition-colors sm:w-80 lg:w-auto lg:max-w-none",
              isTarget ? "border-brand-300 bg-brand-50/60" : "border-transparent",
            )}
          >
            <header className="flex items-center gap-2 px-3.5 pt-3 pb-2">
              <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
              <h2 id={`column-${status}`} className="text-sm font-semibold text-slate-700">
                {STATUS_LABELS[status]}
              </h2>
              <span className="rounded-full bg-white px-1.5 text-xs font-medium text-slate-500 tabular-nums ring-1 ring-slate-200">
                {columnTasks.length}
              </span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onAddTask(status)}
                  aria-label={`Add task to ${STATUS_LABELS[status]}`}
                  className="ml-auto rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                >
                  <Plus className="size-4" />
                </button>
              )}
            </header>

            <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2.5 pb-3">
              {columnTasks.length === 0 ? (
                <li className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                  {canManage ? "Drop tasks here" : "No tasks"}
                </li>
              ) : (
                columnTasks.map((task) => (
                  <li key={task._id}>
                    <TaskCard
                      task={task}
                      draggable={canManage}
                      isDragging={draggedTaskId === task._id}
                      onDragStart={() => setDraggedTaskId(task._id)}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDropTarget(null);
                      }}
                    />
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
