import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  items: MenuItem[];
  /** Optional non-interactive content above the items (e.g. signed-in user). */
  header?: ReactNode;
  align?: "start" | "end";
  placement?: "bottom" | "top";
}

export function DropdownMenu({
  trigger,
  triggerLabel,
  triggerClassName,
  items,
  header,
  align = "end",
  placement = "bottom",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'),
    );
    const index = elements.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? elements.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + elements.length) % elements.length;
    elements[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute z-40 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            placement === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
          )}
        >
          {header && <div className="border-b border-slate-100 px-3 py-2.5">{header}</div>}
          {items.map(({ label, icon: Icon, onSelect, danger, disabled }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm outline-none disabled:opacity-50",
                danger ? "text-red-600 hover:bg-red-50 focus:bg-red-50" : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50",
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
