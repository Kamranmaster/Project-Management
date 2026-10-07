import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <path d="M9 22 16 9l7 13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 22h6" stroke="#c7d2fe" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        Project Camp
      </span>
    </span>
  );
}
