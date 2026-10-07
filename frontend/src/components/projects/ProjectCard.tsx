import { Link } from "react-router";
import { CalendarDays, Users } from "lucide-react";
import { RoleBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { ProjectSummary } from "@/types";
import { ProjectIcon } from "./ProjectIcon";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      to={`/projects/${project._id}/tasks`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <ProjectIcon id={project._id} name={project.name} />
        <RoleBadge role={project.role} />
      </div>
      <h3 className="mt-4 truncate font-semibold text-slate-900 group-hover:text-brand-700">{project.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">
        {project.description?.trim() || <span className="italic text-slate-400">No description</span>}
      </p>
      <div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden />
          {project.members} {project.members === 1 ? "member" : "members"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          Created {formatDate(project.createdAt)}
        </span>
      </div>
    </Link>
  );
}
