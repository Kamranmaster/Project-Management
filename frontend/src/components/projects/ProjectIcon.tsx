import { cn, projectColor } from "@/lib/utils";

const sizes = { sm: "size-6 rounded-md text-[11px]", md: "size-10 rounded-xl text-base" };

export function ProjectIcon({ id, name, size = "md" }: { id: string; name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold text-white",
        projectColor(id),
        sizes[size],
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "P"}
    </span>
  );
}
