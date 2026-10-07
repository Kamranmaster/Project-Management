import { useId } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert, FormField, Input, Textarea } from "@/components/ui/Field";
import { useCreateProject } from "@/hooks/useProjects";
import { applyApiErrorToForm } from "@/lib/errors";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80, "Use at most 80 characters"),
  description: z.string().trim().max(500, "Use at most 500 characters"),
});
export type ProjectValues = z.infer<typeof projectSchema>;

/** Create-project dialog, used from the sidebar and the projects page. */
export function ProjectFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  const createProject = useCreateProject();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create project"
      description="You'll be the admin of the new project and can invite your team next."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={createProject.isPending}>
            Create project
          </Button>
        </>
      }
    >
      <CreateProjectForm formId={formId} createProject={createProject} onCreated={onClose} />
    </Dialog>
  );
}

interface CreateProjectFormProps {
  formId: string;
  createProject: ReturnType<typeof useCreateProject>;
  onCreated: () => void;
}

function CreateProjectForm({ formId, createProject, onCreated }: CreateProjectFormProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProjectValues>({ resolver: zodResolver(projectSchema), defaultValues: { name: "", description: "" } });

  const onSubmit = handleSubmit((values) =>
    createProject
      .mutateAsync(values)
      .then((project) => {
        toast.success("Project created", { description: project.name });
        onCreated();
        navigate(`/projects/${project._id}/tasks`);
      })
      // Project names are globally unique: 409 belongs on the name field.
      .catch((error) =>
        applyApiErrorToForm(error, setError, { fields: ["name", "description"], fieldForStatus: { 409: "name" } }),
      ),
  );

  return <ProjectFields formId={formId} onSubmit={onSubmit} register={register} errors={errors} />;
}

interface ProjectFieldsProps {
  formId: string;
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<ProjectValues>;
  errors: FieldErrors<ProjectValues>;
  disabled?: boolean;
}

/** Shared by the create dialog and the project settings page. */
export function ProjectFields({ formId, onSubmit, register, errors, disabled }: ProjectFieldsProps) {
  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={errors.root?.server?.message} />
      <FormField label="Project name" error={errors.name?.message} hint="Must be unique across Project Camp.">
        {(field) => <Input {...field} {...register("name")} disabled={disabled} data-autofocus placeholder="Website redesign" />}
      </FormField>
      <FormField label="Description" optional error={errors.description?.message}>
        {(field) => (
          <Textarea {...field} {...register("description")} disabled={disabled} rows={4} placeholder="What is this project about?" />
        )}
      </FormField>
    </form>
  );
}
