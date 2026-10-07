import { Link } from "react-router";
import { CheckSquare, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn, displayName } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  draggable: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function TaskCard({ task, draggable, isDragging, onDragStart, onDragEnd }: TaskCardProps) {
  const allSubtasksDone = task.subtaskCount > 0 && task.completedSubtaskCount === task.subtaskCount;

  return (
    <Link
      to={task._id}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task._id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        // relative: keeps the sr-only labels inside the board's horizontal scroller
        "relative block rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300 hover:shadow-sm",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <p
        className={cn(
          "text-sm font-medium wrap-break-word",
          task.status === "done" ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900",
        )}
      >
        {task.title}
      </p>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>}

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        {task.subtaskCount > 0 && (
          <span
            className={cn("inline-flex items-center gap-1 tabular-nums", allSubtasksDone && "text-emerald-600")}
            title="Subtasks completed"
          >
            <CheckSquare className="size-3.5" aria-hidden />
            {task.completedSubtaskCount}/{task.subtaskCount}
            <span className="sr-only">subtasks completed</span>
          </span>
        )}
        {task.attachements.length > 0 && (
          <span className="inline-flex items-center gap-1" title="Attachments">
            <Paperclip className="size-3.5" aria-hidden />
            {task.attachements.length}
            <span className="sr-only">attachments</span>
          </span>
        )}
        <span className="ml-auto">
          {task.assignedTo ? (
            <Avatar user={task.assignedTo} size="xs" />
          ) : (
            <span
              title="Unassigned"
              className="inline-flex size-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400"
            >
              ?
              <span className="sr-only">Unassigned</span>
            </span>
          )}
        </span>
      </div>
      {task.assignedTo && <span className="sr-only">Assigned to {displayName(task.assignedTo)}</span>}
    </Link>
  );
}
