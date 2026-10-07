import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useInviteMember } from "@/hooks/useMembers";
import { applyApiErrorToForm, parseApiError } from "@/lib/errors";
import { invitableRoles, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { cn, displayName } from "@/lib/utils";
import type { ProjectRole } from "@/types";
import { emailSchema } from "@/lib/validation";

const schema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "project_admin", "member"]),
});
type InviteValues = z.infer<typeof schema>;

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentRole: ProjectRole;
}

export function InviteMemberDialog({ open, onClose, projectId, currentRole }: InviteMemberDialogProps) {
  const formId = useId();
  const invite = useInviteMember(projectId);

  return (
    <Dialog
      open={open}
      onClose={invite.isPending ? () => {} : onClose}
      title="Add member"
      description="Add someone who already has a Project Camp account, using the email they signed up with."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={invite.isPending}>
            Add member
          </Button>
        </>
      }
    >
      <InviteForm formId={formId} invite={invite} roles={invitableRoles(currentRole)} onDone={onClose} />
    </Dialog>
  );
}

interface InviteFormProps {
  formId: string;
  invite: ReturnType<typeof useInviteMember>;
  roles: ProjectRole[];
  onDone: () => void;
}

function InviteForm({ formId, invite, roles, onDone }: InviteFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<InviteValues>({ resolver: zodResolver(schema), defaultValues: { email: "", role: "member" } });
  const selectedRole = watch("role");

  const onSubmit = handleSubmit((values) =>
    invite
      .mutateAsync(values)
      .then((user) => {
        toast.success("Member added", { description: `${displayName(user)} joined as ${ROLE_LABELS[values.role]}.` });
        onDone();
      })
      .catch((error) => {
        // 404: no account with this email. 409: already a member.
        const { status } = parseApiError(error);
        if (status === 404) {
          setError("email", { message: "No Project Camp account uses this email. Ask them to sign up first." });
          return;
        }
        applyApiErrorToForm(error, setError, { fields: ["email", "role"], fieldForStatus: { 409: "email" } });
      }),
  );

  return (
    <form id={formId} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={errors.root?.server?.message} />
      <FormField label="Email address" error={errors.email?.message}>
        {(field) => (
          <Input {...field} {...register("email")} type="email" data-autofocus placeholder="teammate@company.com" autoComplete="off" />
        )}
      </FormField>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Role</legend>
        {roles.map((role) => (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
              selectedRole === role ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-400" : "border-slate-200 hover:bg-slate-50",
            )}
          >
            <input type="radio" value={role} {...register("role")} className="mt-0.5 accent-brand-600" />
            <span>
              <span className="block text-sm font-medium text-slate-900">{ROLE_LABELS[role]}</span>
              <span className="block text-xs text-slate-500">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </form>
  );
}
