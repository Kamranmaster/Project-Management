import { Link, NavLink, Outlet, useOutletContext, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { ProjectIcon } from "@/components/projects/ProjectIcon";
import { RoleBadge } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { useProject } from "@/hooks/useProjects";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { ProjectDetail } from "@/types";

export interface ProjectContext {
  project: ProjectDetail;
}

/** Project + current user's role, for every page nested under /projects/:projectId. */
export function useProjectContext() {
  return useOutletContext<ProjectContext>();
}

export function ProjectLayout() {
  const { projectId = "" } = useParams();
  const { data: project, isPending, isError, error, refetch } = useProject(projectId);

  if (isPending) {
    return (
      <div className="border-b border-slate-200 bg-white px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <div className="mt-6 flex gap-6 pb-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-4 w-16" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          error={error}
          onRetry={() => refetch()}
          notFoundTitle="Project not found"
        />
        <div className="mt-6 text-center">
          <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="size-4" aria-hidden />
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { to: "tasks", label: "Tasks" },
    { to: "notes", label: "Notes" },
    { to: "members", label: "Members" },
    ...(can(project.role, "editProject") ? [{ to: "settings", label: "Settings" }] : []),
  ];

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 pt-6 sm:px-6">
        <div className="flex items-start gap-4">
          <ProjectIcon id={project._id} name={project.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
              <RoleBadge role={project.role} />
            </div>
            {project.description && (
              <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-slate-500">{project.description}</p>
            )}
          </div>
        </div>
        <nav aria-label="Project sections" className="-mb-px mt-5 flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet context={{ project } satisfies ProjectContext} />
    </div>
  );
}
