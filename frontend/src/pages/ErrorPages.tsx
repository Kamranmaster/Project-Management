import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { LogoMark } from "@/components/layout/Logo";

function ErrorLayout({ code, title, description }: { code: string; title: string; description: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <LogoMark className="size-10" />
      <p className="mt-8 text-sm font-semibold text-brand-600">{code}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <Link
        to="/projects"
        className="mt-8 inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        Back to projects
      </Link>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <ErrorLayout
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
    />
  );
}

/** Router-level error boundary for unexpected render errors. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  if (import.meta.env.DEV) console.error(error);

  return (
    <ErrorLayout
      code="Error"
      title="Something went wrong"
      description="An unexpected error occurred. Reload the page or head back to your projects."
    />
  );
}
