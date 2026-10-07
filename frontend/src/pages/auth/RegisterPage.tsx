import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import { AuthHeader } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useRegister } from "@/hooks/useAuth";
import { applyApiErrorToForm } from "@/lib/errors";
import { emailSchema, newPasswordSchema, PASSWORD_MISMATCH, usernameSchema } from "@/lib/validation";

const schema = z
  .object({
    fullname: z.string().trim().max(80, "Use at most 80 characters"),
    username: usernameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, PASSWORD_MISMATCH);
type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(schema), defaultValues: { fullname: "" } });

  const onSubmit = handleSubmit(({ fullname, username, email, password }) =>
    registerUser
      .mutateAsync({ fullname: fullname || undefined, username, email, password })
      .catch((error) =>
        applyApiErrorToForm(error, setError, { fields: ["email", "username", "password", "fullname"] }),
      ),
  );

  if (registerUser.isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck className="size-6" aria-hidden />
        </div>
        <AuthHeader
          title="Check your inbox"
          description={
            <>
              We sent a verification link to <strong className="text-slate-700">{getValues("email")}</strong>. The link
              expires in 20 minutes.
            </>
          }
        />
        <Link
          to="/login"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeader title="Create your account" description="Start organising projects with your team." />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={errors.root?.server?.message} />
        <FormField label="Full name" optional error={errors.fullname?.message}>
          {(field) => <Input {...field} {...register("fullname")} autoComplete="name" autoFocus placeholder="Ada Lovelace" />}
        </FormField>
        <FormField label="Username" error={errors.username?.message} hint="Lowercase, at least 3 characters.">
          {(field) => (
            <Input
              {...field}
              {...register("username", { setValueAs: (value: string) => value.toLowerCase() })}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ada"
            />
          )}
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          {(field) => <Input {...field} {...register("email")} type="email" autoComplete="email" placeholder="you@company.com" />}
        </FormField>
        <FormField label="Password" error={errors.password?.message} hint="At least 8 characters.">
          {(field) => <Input {...field} {...register("password")} type="password" autoComplete="new-password" />}
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          {(field) => <Input {...field} {...register("confirmPassword")} type="password" autoComplete="new-password" />}
        </FormField>
        <Button type="submit" className="w-full" loading={registerUser.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </>
  );
}
