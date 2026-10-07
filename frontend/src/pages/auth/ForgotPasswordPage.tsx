import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";
import { AuthHeader } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useForgotPassword } from "@/hooks/useAuth";
import { applyApiErrorToForm } from "@/lib/errors";
import { emailSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema });
type ForgotValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(({ email }) =>
    forgotPassword
      .mutateAsync(email)
      // The backend answers 404 for unknown emails; show it on the field.
      .catch((error) => applyApiErrorToForm(error, setError, { fields: ["email"], fieldForStatus: { 404: "email" } })),
  );

  const backToLogin = (
    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden />
      Back to sign in
    </Link>
  );

  if (forgotPassword.isSuccess) {
    return (
      <>
        <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Mail className="size-6" aria-hidden />
        </div>
        <AuthHeader
          title="Check your email"
          description={
            <>
              We sent a password reset link to <strong className="text-slate-700">{getValues("email")}</strong>. It expires
              in 20 minutes.
            </>
          }
        />
        {backToLogin}
      </>
    );
  }

  return (
    <>
      <AuthHeader title="Reset your password" description="Enter your account email and we'll send you a reset link." />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={errors.root?.server?.message} />
        <FormField label="Email" error={errors.email?.message}>
          {(field) => <Input {...field} {...register("email")} type="email" autoComplete="email" autoFocus />}
        </FormField>
        <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
          Send reset link
        </Button>
      </form>
      <div className="mt-8 text-center">{backToLogin}</div>
    </>
  );
}
