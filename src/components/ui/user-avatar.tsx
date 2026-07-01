"use client";

/**
 * B19: single source of truth for user avatars across the app.
 *
 * Falls back to initials on a deterministic colored background (derived from
 * the name via the local palette below) when no avatarUrl is set.
 * Always renders a perfect circle and clips overflow so any user-uploaded
 * image looks consistent regardless of aspect ratio.
 *
 * Use the `size` prop instead of overriding className width/height so the
 * font scaling for initials stays in sync with the circle diameter.
 */

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Pass a stable ID (userId, member id) to drive the deterministic
   *  fallback color. Defaults to using the display name. */
  seed?: string;
  /** Optional class overrides for the outer container (border, ring,
   *  etc.). Width/height live on `size`. */
  className?: string;
  /** Title attribute for hover tooltips on desktop. */
  title?: string;
}

const SIZE_MAP = {
  xs: { box: "w-5 h-5", text: "text-[9px]" },
  sm: { box: "w-6 h-6", text: "text-[10px]" },
  md: { box: "w-8 h-8", text: "text-xs" },
  lg: { box: "w-10 h-10", text: "text-sm" },
  xl: { box: "w-14 h-14", text: "text-base" },
} as const;

const PALETTE = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-fuchsia-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
];

function pickColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  seed,
  className,
  title,
}: Props) {
  const s = SIZE_MAP[size];
  const color = pickColor(seed || name || "?");
  const label = initials(name || "?");

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        title={title ?? name}
        className={`${s.box} rounded-full object-cover shrink-0 ${className ?? ""}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      title={title ?? name}
      className={`${s.box} rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold shrink-0 ${s.text} ${className ?? ""}`}
    >
      {label}
    </div>
  );
}
