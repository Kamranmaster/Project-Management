import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { ProjectFields, projectSchema, type ProjectValues } from "@/components/projects/ProjectFormDialog";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDeleteProject, useUpdateProject } from "@/hooks/useProjects";
import { applyApiErrorToForm, toastError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { useProjectContext } from "./ProjectLayout";

export function ProjectSettingsPage() {
  const { project } = useProjectContext();

  // Settings are only reachable for roles that can edit; guard direct URL access too.
  if (!can(project.role, "editProject")) {
    return <Navigate to={`/projects/${project._id}/tasks`} replace />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <GeneralSettings />
      {can(project.role, "deleteProject") && <DangerZone />}
    </div>
  );
}

function GeneralSettings() {
  const { project } = useProjectContext();
  const formId = useId();
  const updateProject = useUpdateProject(project._id);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    values: { name: project.name, description: project.description ?? "" },
  });

  const onSubmit = handleSubmit((values) =>
    updateProject
      .mutateAsync(values)
      .then(() => {
        toast.success("Project updated");
        reset(values);
      })
      .catch((error) =>
        applyApiErrorToForm(error, setError, { fields: ["name", "description"], fieldForStatus: { 409: "name" } }),
      ),
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">General</h2>
        <p className="mt-0.5 text-sm text-slate-500">Created {formatDateTime(project.createdAt)}</p>
      </div>
      <div className="px-5 py-5">
        <ProjectFields formId={formId} onSubmit={onSubmit} register={register} errors={errors} />
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 rounded-b-2xl">
        <Button variant="secondary" disabled={!isDirty || updateProject.isPending} onClick={() => reset()}>
          Discard
        </Button>
        <Button type="submit" form={formId} disabled={!isDirty} loading={updateProject.isPending}>
          Save changes
        </Button>
      </div>
    </section>
  );
}

function DangerZone() {
  const { project } = useProjectContext();
  const navigate = useNavigate();
  const deleteProject = useDeleteProject(project._id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onConfirm = () =>
    deleteProject.mutate(undefined, {
      onSuccess: () => {
        toast.success("Project deleted", { description: project.name });
        navigate("/projects", { replace: true });
      },
      onError: (error) => toastError(error, "Couldn't delete the project"),
    });

  return (
    <section className="rounded-2xl border border-red-200 bg-white shadow-xs">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Delete project</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Permanently removes the project with all of its tasks, subtasks, notes and memberships.
          </p>
        </div>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Delete project
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
        loading={deleteProject.isPending}
        title="Delete this project?"
        description="This can't be undone. Everything in the project is deleted for all members."
        confirmLabel="Delete project"
        confirmationText={project.name}
      />
    </section>
  );
}
