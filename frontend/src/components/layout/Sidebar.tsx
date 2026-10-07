import { useState } from "react";
import { Link, NavLink } from "react-router";
import { FolderKanban, Plus, UserRound, type LucideIcon } from "lucide-react";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectIcon } from "@/components/projects/ProjectIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/States";
import { useAuthenticatedUser } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, displayName } from "@/lib/utils";
import { Logo } from "./Logo";

const mainNav: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: "/projects", label: "Projects", icon: FolderKanban, end: true },
  { to: "/account", label: "Account", icon: UserRound },
];

export function Sidebar() {
  const user = useAuthenticatedUser();
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link to="/projects" aria-label="Project Camp home">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Main" className="space-y-0.5 px-3 pt-4">
        {mainNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex items-center justify-between px-5">
        <h2 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Your projects</h2>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Create project"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <nav aria-label="Projects" className="mt-2 flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {projects.isPending ? (
          <div className="space-y-2 px-2.5 pt-1">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-7" />
            ))}
          </div>
        ) : projects.isError ? (
          <p className="px-2.5 text-xs text-slate-500">
            Couldn't load projects.{" "}
            <button type="button" className="font-medium text-brand-600" onClick={() => projects.refetch()}>
              Retry
            </button>
          </p>
        ) : projects.data.length === 0 ? (
          <p className="px-2.5 text-xs text-slate-500">No projects yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {projects.data.map((project) => (
              <li key={project._id}>
                <NavLink
                  to={`/projects/${project._id}`}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                      isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )
                  }
                >
                  <ProjectIcon id={project._id} name={project.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                  {project.role !== "member" && (
                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-500">
                      {ROLE_LABELS[project.role]}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <Link
        to="/account"
        className="flex items-center gap-3 border-t border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <Avatar user={user} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{displayName(user)}</span>
          <span className="block truncate text-xs text-slate-500">{user.email}</span>
        </span>
      </Link>

      <ProjectFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
