import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack of open dialogs so Escape / focus trapping only apply to the topmost one
// (e.g. a confirm dialog on top of the task drawer).
const openDialogs: number[] = [];
let nextDialogId = 0;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** "drawer" slides in from the right and fills the height. */
  variant?: "modal" | "drawer";
  /** Extra header content next to the title (e.g. action buttons). */
  headerActions?: ReactNode;
}

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Accessible modal built on a portal instead of native <dialog>: native modal
 * dialogs render in the browser top layer, which would hide toast notifications.
 * Children are only mounted while open, so forms inside start fresh each time.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "modal",
  headerActions,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const id = ++nextDialogId;
    openDialogs.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const first = panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== id) return;

      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab" && panelRef.current) {
        const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      openDialogs.splice(openDialogs.indexOf(id), 1);
      if (openDialogs.length === 0) document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const isDrawer = variant === "drawer";

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex", isDrawer ? "justify-end" : "items-end justify-center p-0 sm:items-center sm:p-4")}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" aria-hidden onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full flex-col bg-white shadow-xl focus:outline-none",
          isDrawer
            ? "h-full max-w-2xl"
            : cn("max-h-[90dvh] rounded-t-2xl sm:rounded-2xl", sizes[size]),
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          {headerActions}
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 sm:flex-row sm:justify-end sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
