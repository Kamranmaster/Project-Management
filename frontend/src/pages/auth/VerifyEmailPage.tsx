import { Link, useParams } from "react-router";
import { CircleCheck, CircleX } from "lucide-react";
import { AuthHeader } from "@/components/layout/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";
import { useCurrentUser, useVerifyEmail } from "@/hooks/useAuth";
import { parseApiError } from "@/lib/errors";

const linkClass =
  "inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700";

export function VerifyEmailPage() {
  const { verificationToken = "" } = useParams();
  const verification = useVerifyEmail(verificationToken);
  const { data: user } = useCurrentUser();
  const continueTo = user ? { to: "/projects", label: "Go to your projects" } : { to: "/login", label: "Sign in" };

  if (verification.isPending) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
        <Spinner className="size-6 text-brand-600" />
        Verifying your email…
      </div>
    );
  }

  if (verification.isError) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <CircleX className="size-6" aria-hidden />
        </div>
        <AuthHeader
          title="This link can't be used"
          description={`${parseApiError(verification.error).message}. Verification links expire after 20 minutes — you can request a new one from your account page.`}
        />
        <Link to={user ? "/account" : "/login"} className={linkClass}>
          {user ? "Go to account" : "Sign in to request a new link"}
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CircleCheck className="size-6" aria-hidden />
      </div>
      <AuthHeader title="Email verified" description="Thanks — your email address is confirmed." />
      <Link to={continueTo.to} className={linkClass}>
        {continueTo.label}
      </Link>
    </div>
  );
}
