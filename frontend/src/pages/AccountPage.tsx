import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, LogOut, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useAuthenticatedUser, useChangePassword, useLogout, useResendVerification } from "@/hooks/useAuth";
import { applyApiErrorToForm, toastError } from "@/lib/errors";
import { displayName, formatDate } from "@/lib/utils";
import { newPasswordSchema, PASSWORD_MISMATCH } from "@/lib/validation";

export function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Account" description="Your profile, security and session." />
      <ProfileCard />
      <ChangePasswordCard />
      <SessionCard />
    </div>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function ProfileCard() {
  const user = useAuthenticatedUser();
  const resend = useResendVerification();

  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: "Full name", value: user.FullName || <span className="text-slate-400">Not set</span> },
    { label: "Username", value: `@${user.username}` },
    {
      label: "Email",
      value: (
        <span className="flex flex-wrap items-center gap-2">
          {user.email}
          {user.isEmailVerified ? (
            <Badge tone="success">
              <BadgeCheck className="size-3" aria-hidden />
              Verified
            </Badge>
          ) : (
            <Badge tone="warning">
              <MailWarning className="size-3" aria-hidden />
              Not verified
            </Badge>
          )}
        </span>
      ),
    },
    { label: "Member since", value: formatDate(user.createdAt) },
  ];

  return (
    <Card title="Profile" description="Profile details can't be edited yet.">
      <div className="flex items-center gap-4">
        <Avatar user={user} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{displayName(user)}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>
      {!user.isEmailVerified && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <p className="flex-1">Didn't get the verification email? Links expire after 20 minutes.</p>
          <Button
            variant="secondary"
            size="sm"
            loading={resend.isPending}
            onClick={() =>
              resend.mutate(undefined, {
                onSuccess: () => toast.success("Verification email sent", { description: `Check ${user.email}.` }),
                onError: (error) => toastError(error, "Couldn't send the email"),
              })
            }
          >
            Resend verification email
          </Button>
        </div>
      )}
    </Card>
  );
}

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Enter your current password"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, PASSWORD_MISMATCH)
  .refine((values) => values.newPassword !== values.oldPassword, {
    message: "Choose a password different from your current one",
    path: ["newPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(({ oldPassword, newPassword }) =>
    changePassword
      .mutateAsync({ oldPassword, newPassword })
      .then(() => {
        toast.success("Password changed");
        reset();
      })
      // 400 "Invalid old password" belongs on the current-password field.
      .catch((error) =>
        applyApiErrorToForm(error, setError, {
          fields: ["oldPassword", "newPassword"],
          fieldForStatus: { 400: "oldPassword" },
        }),
      ),
  );

  return (
    <Card title="Change password" description="Use at least 8 characters.">
      <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
        <FormAlert message={errors.root?.server?.message} />
        <FormField label="Current password" error={errors.oldPassword?.message}>
          {(field) => <Input {...field} {...register("oldPassword")} type="password" autoComplete="current-password" />}
        </FormField>
        <FormField label="New password" error={errors.newPassword?.message}>
          {(field) => <Input {...field} {...register("newPassword")} type="password" autoComplete="new-password" />}
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          {(field) => <Input {...field} {...register("confirmPassword")} type="password" autoComplete="new-password" />}
        </FormField>
        <Button type="submit" loading={changePassword.isPending}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

function SessionCard() {
  const logout = useLogout();
  return (
    <Card title="Session">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Sign out of Project Camp on this device.</p>
        <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </Card>
  );
}
