import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { MailWarning, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuthenticatedUser, useResendVerification } from "@/hooks/useAuth";
import { toastError } from "@/lib/errors";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile navigation after navigating.
  useEffect(() => setMobileNavOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setMobileNavOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 lg:block">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/40" aria-hidden onClick={() => setMobileNavOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl">
            <Sidebar />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Topbar onOpenNavigation={() => setMobileNavOpen(true)} />
        <VerificationBanner />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function VerificationBanner() {
  const user = useAuthenticatedUser();
  const resend = useResendVerification();

  if (user.isEmailVerified) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 sm:px-6">
      <MailWarning className="size-4 shrink-0" aria-hidden />
      <p className="flex-1">
        Please verify <strong className="font-medium">{user.email}</strong> using the link we emailed you.
      </p>
      <Button
        variant="secondary"
        size="sm"
        loading={resend.isPending}
        disabled={resend.isSuccess}
        onClick={() =>
          resend.mutate(undefined, {
            onSuccess: () => toast.success("Verification email sent", { description: `Check ${user.email}.` }),
            onError: (error) => toastError(error, "Couldn't send the email"),
          })
        }
      >
        {resend.isSuccess ? "Email sent" : "Resend email"}
      </Button>
    </div>
  );
}
