import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("animate-spin", className)} />;
}

export function FullPageSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-slate-50">
      <Spinner className="size-6 text-brand-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
