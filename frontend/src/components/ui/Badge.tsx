import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn, STATUS_LABELS } from "@/lib/utils";
import type { ProjectRole, TaskStatus } from "@/types";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const roleTones: Record<ProjectRole, Tone> = {
  admin: "brand",
  project_admin: "info",
  member: "neutral",
};

export function RoleBadge({ role }: { role: ProjectRole }) {
  return <Badge tone={roleTones[role]}>{ROLE_LABELS[role]}</Badge>;
}

export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
};

const statusTones: Record<TaskStatus, Tone> = {
  todo: "neutral",
  in_progress: "warning",
  done: "success",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge tone={statusTones[status]}>
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
