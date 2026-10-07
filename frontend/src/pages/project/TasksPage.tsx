import { useMemo, useState } from "react";
import { Outlet } from "react-router";
import { KanbanSquare, Plus, Search } from "lucide-react";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useAuthenticatedUser } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types";
import { useProjectContext } from "./ProjectLayout";

type AssigneeFilter = "all" | "mine" | "unassigned";

export function TasksPage() {
  const context = useProjectContext();
  const { project } = context;
  const user = useAuthenticatedUser();
  const tasks = useTasks(project._id);
  const canManage = can(project.role, "manageTasks");

  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState<AssigneeFilter>("all");
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (tasks.data ?? []).filter((task) => {
      if (assignee === "mine" && task.assignedTo?._id !== user._id) return false;
      if (assignee === "unassigned" && task.assignedTo) return false;
      if (!term) return true;
      return task.title.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term);
    });
  }, [tasks.data, search, assignee, user._id]);

  const total = tasks.data?.length ?? 0;
  const done = tasks.data?.filter((task) => task.status === "done").length ?? 0;
  const isFiltering = search.trim() !== "" || assignee !== "all";

  return (
    <div className="flex-1 space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="pl-9"
          />
        </div>
        <Select
          value={assignee}
          onChange={(event) => setAssignee(event.target.value as AssigneeFilter)}
          aria-label="Filter by assignee"
          className="sm:w-48"
        >
          <option value="all">All assignees</option>
          <option value="mine">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </Select>
        {total > 0 && (
          <p className="text-sm text-slate-500 sm:ml-2">
            <span className="font-medium text-slate-700 tabular-nums">{done}</span> of{" "}
            <span className="tabular-nums">{total}</span> done
          </p>
        )}
        {canManage && (
          <Button className="sm:ml-auto" onClick={() => setCreateStatus("todo")}>
            <Plus className="size-4" aria-hidden />
            New task
          </Button>
        )}
      </div>

      {tasks.isPending ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((column) => (
            <div key={column} className={cn("space-y-2 rounded-2xl bg-slate-100/70 p-3", column > 0 && "hidden lg:block")}>
              <Skeleton className="h-4 w-24" />
              {[0, 1, 2].map((card) => (
                <Skeleton key={card} className="h-20 rounded-xl bg-white" />
              ))}
            </div>
          ))}
        </div>
      ) : tasks.isError ? (
        <ErrorState error={tasks.error} onRetry={() => tasks.refetch()} />
      ) : total === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No tasks yet"
          description={
            canManage
              ? "Create the first task to start planning work on the board."
              : "Tasks created by admins and project admins will show up here."
          }
          action={
            canManage && (
              <Button onClick={() => setCreateStatus("todo")}>
                <Plus className="size-4" aria-hidden />
                New task
              </Button>
            )
          }
        />
      ) : (
        <>
          {isFiltering && filtered.length === 0 && (
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
              No tasks match the current filters.
            </p>
          )}
          <TaskBoard projectId={project._id} tasks={filtered} canManage={canManage} onAddTask={setCreateStatus} />
        </>
      )}

      <TaskFormDialog
        open={createStatus !== null}
        onClose={() => setCreateStatus(null)}
        projectId={project._id}
        defaultStatus={createStatus ?? "todo"}
      />

      {/* Task detail drawer (/tasks/:taskId) */}
      <Outlet context={context} />
    </div>
  );
}
