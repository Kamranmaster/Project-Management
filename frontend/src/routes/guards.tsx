import { Navigate, Outlet, useLocation, type Location } from "react-router";
import { ErrorState } from "@/components/ui/States";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useCurrentUser } from "@/hooks/useAuth";

export interface RedirectState {
  from?: Pick<Location, "pathname" | "search">;
}

/** Renders child routes only for signed-in users; otherwise sends them to /login. */
export function ProtectedRoute() {
  const location = useLocation();
  const { data: user, isPending, isError, error, refetch } = useCurrentUser();

  if (isPending) return <FullPageSpinner label="Checking your session" />;

  // Not a 401 (that resolves to null) — the API is unreachable or failing.
  if (isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
        <ErrorState error={error} onRetry={() => refetch()} className="w-full max-w-md" />
      </div>
    );
  }

  if (!user) {
    const state: RedirectState = { from: { pathname: location.pathname, search: location.search } };
    return <Navigate to="/login" replace state={state} />;
  }

  return <Outlet />;
}

/** Login/register pages: signed-in users are sent back to where they came from. */
export function PublicOnlyRoute() {
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageSpinner />;

  if (user) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : "/projects"} replace />;
  }

  return <Outlet />;
}
