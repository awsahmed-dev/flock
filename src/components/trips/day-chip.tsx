"use client";

import Link from "next/link";

/**
 * Sprint 8 Item 4 — THE day chip. One component for the planning rail,
 * the LIVE day rail, and the itinerary sheet, ending the style drift:
 * planning-phase tokens (muted surface + hairline border, wayfind fill
 * when selected) at LIVE-phase size (44px pill), carrying the day's map
 * color as a 3px bottom border so chips and markers stay linked.
 */
export function DayChip({
  label,
  active = false,
  dayColor,
  count,
  href,
  onClick,
  chipRef,
}: {
  label: React.ReactNode;
  active?: boolean;
  /** The day's map color (getDayColor) — omit for non-day chips like "All". */
  dayColor?: string;
  /** Stop count — renders as a quiet "·N" when > 0. */
  count?: number;
  href?: string;
  onClick?: () => void;
  chipRef?: React.Ref<HTMLButtonElement>;
}) {
  const cls = `shrink-0 h-11 min-w-[84px] px-4 rounded-full inline-flex items-center justify-center gap-1 text-sm font-bold whitespace-nowrap transition-colors border ${
    active ? "text-white border-transparent" : "bg-muted text-muted-foreground border-border"
  }`;
  const style: React.CSSProperties = {
    ...(dayColor ? { borderBottom: `3px solid ${dayColor}` } : {}),
    ...(active ? { background: "var(--clr-wayfind)" } : {}),
  };
  const content = (
    <>
      {label}
      {count != null && count > 0 && (
        <span className={`tabular-nums text-xs font-semibold ${active ? "text-white/75" : "opacity-70"}`}>
          ·{count}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={chipRef} type="button" onClick={onClick} className={cls} style={style}>
      {content}
    </button>
  );
}
