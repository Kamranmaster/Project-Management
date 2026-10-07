import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { AuthHeader } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useResetPassword } from "@/hooks/useAuth";
import { applyApiErrorToForm, parseApiError } from "@/lib/errors";
import { newPasswordSchema, PASSWORD_MISMATCH } from "@/lib/validation";

const schema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, PASSWORD_MISMATCH);
type ResetValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { resetToken = "" } = useParams();
  const navigate = useNavigate();
  const resetPassword = useResetPassword(resetToken);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(({ newPassword }) =>
    resetPassword
      .mutateAsync(newPassword)
      .then(() => {
        toast.success("Password updated", { description: "Sign in with your new password." });
        navigate("/login", { replace: true });
      })
      .catch((error) => applyApiErrorToForm(error, setError, { fields: ["newPassword"] })),
  );

  // 400 = "token is invalid or expired": the link can't be used again.
  const tokenInvalid = resetPassword.isError && parseApiError(resetPassword.error).status === 400;

  return (
    <>
      <AuthHeader title="Choose a new password" description="Make it at least 8 characters." />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={errors.root?.server?.message} />
        {tokenInvalid && (
          <p className="text-sm text-slate-600">
            Reset links expire after 20 minutes and can only be used once.{" "}
            <Link to="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
              Request a new link
            </Link>
          </p>
        )}
        <FormField label="New password" error={errors.newPassword?.message}>
          {(field) => <Input {...field} {...register("newPassword")} type="password" autoComplete="new-password" autoFocus />}
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          {(field) => <Input {...field} {...register("confirmPassword")} type="password" autoComplete="new-password" />}
        </FormField>
        <Button type="submit" className="w-full" loading={resetPassword.isPending}>
          Update password
        </Button>
      </form>
    </>
  );
}
