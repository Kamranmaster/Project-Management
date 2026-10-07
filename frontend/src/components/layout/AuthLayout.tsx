import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { CheckCircle2, KanbanSquare, NotebookPen, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

const highlights = [
  { icon: KanbanSquare, text: "Plan work on a board with tasks, subtasks and attachments" },
  { icon: ShieldCheck, text: "Per-project roles keep the right people in control" },
  { icon: NotebookPen, text: "Shared project notes for decisions and context" },
];

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-slate-950 p-10 lg:flex">
        <div
          aria-hidden
          className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-brand-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-0 size-80 rounded-full bg-indigo-400/10 blur-3xl"
        />
        <Logo inverted className="relative" />
        <div className="relative space-y-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-white">
            Keep every project moving,
            <br />
            <span className="text-brand-200">together.</span>
          </h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-300">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-200">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Sessions are secured with httpOnly cookies
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AuthHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
