import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "react-router";
import { z } from "zod";
import { AuthHeader } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { FormAlert, FormField, Input } from "@/components/ui/Field";
import { useLogin } from "@/hooks/useAuth";
import { applyApiErrorToForm } from "@/lib/errors";
import { emailSchema } from "@/lib/validation";
import type { RedirectState } from "@/routes/guards";

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const location = useLocation();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  // On success the user is cached and PublicOnlyRoute redirects to `from` (or /projects).
  const onSubmit = handleSubmit((values) =>
    login.mutateAsync(values).catch((error) =>
      applyApiErrorToForm(error, setError, { fields: ["email", "password"] }),
    ),
  );

  const redirectedFrom = (location.state as RedirectState | null)?.from;

  return (
    <>
      <AuthHeader
        title="Welcome back"
        description={redirectedFrom ? "Sign in to continue where you left off." : "Sign in to your Project Camp account."}
      />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormAlert message={errors.root?.server?.message} />
        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <Input {...field} {...register("email")} type="email" autoComplete="email" autoFocus placeholder="you@company.com" />
          )}
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          labelAction={
            <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          }
        >
          {(field) => <Input {...field} {...register("password")} type="password" autoComplete="current-password" />}
        </FormField>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        New to Project Camp?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </>
  );
}
