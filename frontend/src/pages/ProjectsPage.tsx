import { useMemo, useState } from "react";
import { FolderPlus, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useAuthenticatedUser } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { displayName } from "@/lib/utils";

export function ProjectsPage() {
  const user = useAuthenticatedUser();
  const projects = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!projects.data || !term) return projects.data ?? [];
    return projects.data.filter(
      (project) =>
        project.name.toLowerCase().includes(term) || project.description?.toLowerCase().includes(term),
    );
  }, [projects.data, search]);

  const hasProjects = (projects.data?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={`Welcome, ${displayName(user).split(" ")[0]}`}
        description="All the projects you're a member of."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New project
          </Button>
        }
      />

      {hasProjects && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>
      )}

      {projects.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
              <Skeleton className="mt-6 h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : !hasProjects ? (
        <EmptyState
          icon={FolderPlus}
          title="Create your first project"
          description="Projects hold your team's tasks, notes and members. You'll be its admin."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matching projects" description={`Nothing matches “${search.trim()}”.`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <li key={project._id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      <ProjectFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
