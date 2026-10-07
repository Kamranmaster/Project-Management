import { Link, useLocation, useMatches, useNavigate } from "react-router";
import { ChevronRight, LogOut, Menu, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { useAuthenticatedUser, useLogout } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProjects";
import { useTask } from "@/hooks/useTasks";
import { cn, displayName } from "@/lib/utils";

const SECTION_LABELS: Record<string, string> = {
  tasks: "Tasks",
  notes: "Notes",
  members: "Members",
  settings: "Settings",
};

function useBreadcrumbs() {
  const matches = useMatches();
  const { pathname } = useLocation();
  const params = matches[matches.length - 1]?.params ?? {};
  const { projectId, taskId } = params;

  // These read from the same cache as the pages, so no extra requests are made.
  const project = useProject(projectId);
  const task = useTask(projectId ?? "", taskId);

  const crumbs: Array<{ label: string; to?: string }> = [];

  if (pathname.startsWith("/account")) {
    crumbs.push({ label: "Account" });
  } else {
    crumbs.push({ label: "Projects", to: "/projects" });
  }

  if (projectId) {
    crumbs.push({ label: project.data?.name ?? "…", to: `/projects/${projectId}` });
    const section = pathname.split("/")[3];
    if (section && SECTION_LABELS[section]) {
      crumbs.push({ label: SECTION_LABELS[section], to: taskId ? `/projects/${projectId}/${section}` : undefined });
    }
    if (taskId) crumbs.push({ label: task.data?.title ?? "…" });
  }

  // The last crumb is the current page and is never a link.
  return crumbs.map((crumb, index) => (index === crumbs.length - 1 ? { label: crumb.label } : crumb));
}

export function Topbar({ onOpenNavigation }: { onOpenNavigation: () => void }) {
  const user = useAuthenticatedUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenNavigation}
        aria-label="Open navigation"
        className="-ml-1.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm">
          {crumbs.map((crumb, index) => {
            // On small screens only the last two crumbs are shown, without a leading chevron.
            const hiddenOnMobile = index < crumbs.length - 2;
            const firstVisibleOnMobile = index === Math.max(crumbs.length - 2, 0);
            return (
              <li
                key={`${crumb.label}-${index}`}
                className={cn("min-w-0 items-center gap-1.5", hiddenOnMobile ? "hidden sm:flex" : "flex")}
              >
                {index > 0 && (
                  <ChevronRight
                    className={cn("size-3.5 shrink-0 text-slate-300", firstVisibleOnMobile && "hidden sm:block")}
                    aria-hidden
                  />
                )}
                {crumb.to ? (
                  <Link to={crumb.to} className="block truncate text-slate-500 hover:text-slate-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="block truncate font-medium text-slate-900">
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <DropdownMenu
        triggerLabel="Account menu"
        triggerClassName="rounded-full"
        trigger={<Avatar user={user} size="sm" />}
        header={
          <>
            <p className="truncate text-sm font-medium text-slate-900">{displayName(user)}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </>
        }
        items={[
          { label: "Account settings", icon: UserRound, onSelect: () => navigate("/account") },
          { label: "Sign out", icon: LogOut, danger: true, onSelect: () => logout.mutate() },
        ]}
      />
    </header>
  );
}
