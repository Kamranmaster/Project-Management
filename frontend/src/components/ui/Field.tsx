import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const controlState = (invalid?: boolean) =>
  invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
    : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/20";

interface ControlProps {
  invalid?: boolean;
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & ControlProps & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlBase, controlState(invalid), "h-9", className)}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(controlBase, controlState(invalid), "min-h-24 py-2", className)}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & ControlProps & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(controlBase, controlState(invalid), "h-9 pr-8", className)}
      {...props}
    >
      {children}
    </select>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  /** Receives the generated id plus aria props to spread onto the control. */
  children: (control: { id: string; "aria-describedby"?: string; invalid: boolean }) => ReactNode;
  className?: string;
  labelAction?: ReactNode;
}

/** Label + control + hint/error, wired up for screen readers. */
export function FormField({ label, error, hint, optional, children, className, labelAction }: FormFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
          {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
        </label>
        {labelAction}
      </div>
      {children({ id, "aria-describedby": describedBy, invalid: !!error })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error (e.g. "Password is invalid", network failures). */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
