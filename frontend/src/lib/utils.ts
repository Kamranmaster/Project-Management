import { twMerge } from "tailwind-merge";
import type { TaskStatus, UserSummary } from "@/types";

/** Joins class names; later Tailwind classes override conflicting earlier ones (e.g. h-8 over h-9). */
export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function displayName(user?: Pick<UserSummary, "username" | "FullName"> | null) {
  if (!user) return "Unknown user";
  return user.FullName?.trim() || user.username;
}

export function initials(user?: Pick<UserSummary, "username" | "FullName"> | null) {
  const name = displayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function formatDate(value?: string) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatDateTime(value?: string) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

export function formatRelative(value?: string) {
  if (!value) return "—";
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/** Uploaded files are stored as "<timestamp>-<original name>". */
export function attachmentName(url: string) {
  const file = decodeURIComponent(url.split("/").pop() ?? "file");
  return file.replace(/^\d{10,}-/, "");
}

const projectColors = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
];

/** Stable accent colour per project, derived from its id. */
export function projectColor(projectId: string) {
  let hash = 0;
  for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return projectColors[Math.abs(hash) % projectColors.length];
}

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

/** Backend multer limits: 5 files, 1 MB each. */
export const ATTACHMENT_LIMITS = { maxFiles: 5, maxBytes: 1_000_000 };
