import { useState } from "react";
import { cn, displayName, initials } from "@/lib/utils";
import type { UserSummary } from "@/types";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-14 text-lg",
};

const palette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

// The backend's default avatar is a grey placeholder image; initials look better.
const isPlaceholder = (url?: string) => !url || url.includes("placehold.co");

interface AvatarProps {
  user?: Pick<UserSummary, "username" | "FullName" | "avatar"> | null;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ user, size = "md", className }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = user?.avatar?.url;
  const name = displayName(user);
  const showImage = !isPlaceholder(url) && !imageFailed;

  return (
    <span
      title={name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-white",
        sizes[size],
        !showImage && colorFor(user?.username ?? name),
        className,
      )}
    >
      {showImage ? (
        <img src={url} alt="" className="size-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <span aria-hidden>{user ? initials(user) : "?"}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
