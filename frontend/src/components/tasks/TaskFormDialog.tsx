import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert, FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { useMembers } from "@/hooks/useMembers";
import { useCreateTask, useUpdateTask } from "@/hooks/useTasks";
import { applyApiErrorToForm } from "@/lib/errors";
import { displayName, STATUS_LABELS, TASK_STATUSES } from "@/lib/utils";
import type { Task, TaskDetail, TaskStatus } from "@/types";
import { AttachmentList } from "./AttachmentList";
import { FilePicker } from "./FilePicker";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Use at most 200 characters"),
  description: z.string().trim().max(5000, "Use at most 5000 characters"),
  assignedTo: z.string(),
  status: z.enum(["todo", "in_progress", "done"]),
});
type TaskValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** When provided the dialog edits this task; otherwise it creates one. */
  task?: TaskDetail | Task;
  defaultStatus?: TaskStatus;
  onSaved?: (task: Task) => void;
}

export function TaskFormDialog({ open, onClose, projectId, task, defaultStatus = "todo", onSaved }: TaskFormDialogProps) {
  const formId = useId();
  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const pending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog
      open={open}
      onClose={pending ? () => {} : onClose}
      title={task ? "Edit task" : "New task"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </>
      }
    >
      <TaskForm
        formId={formId}
        projectId={projectId}
        task={task}
        defaultStatus={defaultStatus}
        disabled={pending}
        submit={async (input) => {
          const saved = task
            ? await updateTask.mutateAsync({ taskId: task._id, input })
            : await createTask.mutateAsync(input);
          toast.success(task ? "Task updated" : "Task created", { description: saved.title });
          onSaved?.(saved);
          onClose();
        }}
      />
    </Dialog>
  );
}

interface TaskFormProps {
  formId: string;
  projectId: string;
  task?: TaskDetail | Task;
  defaultStatus: TaskStatus;
  disabled: boolean;
  submit: (input: TaskValues & { files: File[] }) => Promise<void>;
}

function TaskForm({ formId, projectId, task, defaultStatus, disabled, submit }: TaskFormProps) {
  const members = useMembers(projectId);
  const [files, setFiles] = useState<File[]>([]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TaskValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assignedTo: task?.assignedTo?._id ?? "",
      status: task?.status ?? defaultStatus,
    },
  });

  const onSubmit = handleSubmit((values) =>
    submit({ ...values, files }).catch((error) =>
      applyApiErrorToForm(error, setError, { fields: ["title", "description", "assignedTo", "status"] }),
    ),
  );

  // Keep the current assignee selectable even if they are no longer a member.
  const currentAssignee = task?.assignedTo;
  const assigneeMissing =
    currentAssignee && members.data && !members.data.some((member) => member.user?._id === currentAssignee._id);

  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={errors.root?.server?.message} />
      <FormField label="Title" error={errors.title?.message}>
        {(field) => <Input {...field} {...register("title")} data-autofocus placeholder="What needs to be done?" disabled={disabled} />}
      </FormField>
      <FormField label="Description" optional error={errors.description?.message}>
        {(field) => (
          <Textarea {...field} {...register("description")} rows={5} placeholder="Add details, context or acceptance criteria" disabled={disabled} />
        )}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Assignee"
          error={errors.assignedTo?.message}
          hint={members.isError ? "Couldn't load members." : undefined}
        >
          {(field) =>
            // The registered select mounts only once its options exist, otherwise the
            // browser can't select the saved assignee and the UI would show "Unassigned".
            members.isPending ? (
              <Select id={field.id} disabled>
                <option>Loading members…</option>
              </Select>
            ) : (
            <Select {...field} {...register("assignedTo")} disabled={disabled}>
              <option value="">Unassigned</option>
              {assigneeMissing && <option value={currentAssignee._id}>{displayName(currentAssignee)} (former member)</option>}
              {members.data?.map(
                (member) =>
                  member.user && (
                    <option key={member.user._id} value={member.user._id}>
                      {displayName(member.user)} (@{member.user.username})
                    </option>
                  ),
              )}
            </Select>
            )
          }
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          {(field) => (
            <Select {...field} {...register("status")} disabled={disabled}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">
          {task ? "Add attachments" : "Attachments"} <span className="font-normal text-slate-400">(optional)</span>
        </p>
        {task && task.attachements.length > 0 && (
          <div className="pb-2">
            <AttachmentList attachments={task.attachements} />
            <p className="mt-2 text-xs text-slate-500">New files are added to the existing attachments.</p>
          </div>
        )}
        <FilePicker files={files} onChange={setFiles} disabled={disabled} />
      </div>
    </form>
  );
}
