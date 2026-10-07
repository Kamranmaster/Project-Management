import type { ReactNode } from "react";
import { AlertTriangle, Lock, RefreshCw, SearchX, type LucideIcon } from "lucide-react";
import { parseApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-slate-200/70", className)} />;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  /** Title override for 404s, e.g. "Project not found". */
  notFoundTitle?: string;
  className?: string;
}

/** Status-aware error panel: 403 / 404 explain themselves, 5xx and network errors offer a retry. */
export function ErrorState({ error, onRetry, notFoundTitle = "Not found", className }: ErrorStateProps) {
  const { status, message } = parseApiError(error);

  let icon: LucideIcon = AlertTriangle;
  let title = "Something went wrong";
  let retryable = true;

  // 400 here is almost always a malformed id in the URL ("Invalid id").
  if (status === 404 || status === 400) {
    icon = SearchX;
    title = notFoundTitle;
    retryable = false;
  } else if (status === 403) {
    icon = Lock;
    title = "Access denied";
    retryable = false;
  }

  const Icon = icon;
  // The API's 404 message often repeats the title ("Project not found").
  const description =
    message.toLowerCase() === title.toLowerCase()
      ? "It may have been deleted, or you might not be a member of this project."
      : message;

  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center", className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {retryable && onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-3.5" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
