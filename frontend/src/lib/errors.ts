import { isAxiosError } from "axios";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import type { ApiErrorBody } from "@/types";

export interface ParsedApiError {
  /** HTTP status, or undefined for network errors. */
  status?: number;
  message: string;
  /** express-validator errors flattened to { field: message }. */
  fieldErrors: Record<string, string>;
}

const FALLBACK_MESSAGES: Record<number, string> = {
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  500: "Something went wrong on our side. Please try again.",
};

export function parseApiError(error: unknown): ParsedApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return {
        message: "Can't reach the server. Check your connection and try again.",
        fieldErrors: {},
      };
    }

    const { status, data } = error.response;
    const fieldErrors: Record<string, string> = {};
    for (const entry of data?.errors ?? []) {
      if (entry && typeof entry === "object") Object.assign(fieldErrors, entry);
    }

    // 5xx messages are internal details; show a friendly message instead.
    const serverMessage = status < 500 && typeof data?.message === "string" ? data.message : "";

    return {
      status,
      message: serverMessage || FALLBACK_MESSAGES[status] || FALLBACK_MESSAGES[500],
      fieldErrors,
    };
  }

  return { message: FALLBACK_MESSAGES[500], fieldErrors: {} };
}

export function toastError(error: unknown, fallbackTitle?: string) {
  const { message, status } = parseApiError(error);
  // 401s are handled by the refresh interceptor / redirect to login.
  if (status === 401) return;
  toast.error(fallbackTitle ?? message, fallbackTitle ? { description: message } : undefined);
}

/**
 * Maps a failed request onto a react-hook-form form: 422 validation errors go
 * to their fields, `fieldForStatus` routes e.g. a 409 to a specific field, and
 * anything else becomes a form-level `root` error.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: { fields?: Array<Path<T>>; fieldForStatus?: Partial<Record<number, Path<T>>> } = {},
) {
  const parsed = parseApiError(error);
  let handled = false;

  for (const [field, message] of Object.entries(parsed.fieldErrors)) {
    if (options.fields?.includes(field as Path<T>)) {
      setError(field as Path<T>, { type: "server", message });
      handled = true;
    }
  }

  const statusField = parsed.status ? options.fieldForStatus?.[parsed.status] : undefined;
  if (statusField) {
    setError(statusField, { type: "server", message: parsed.message });
    handled = true;
  }

  if (!handled) {
    setError("root.server" as Path<T>, { type: "server", message: parsed.message });
  }
}
