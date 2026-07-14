"use client";

import Link from "next/link";

/**
 * Sprint 8 Item 4 + design-review Page 8 — THE day chip. One component for
 * the planning rail, the LIVE day rail, and the itinerary sheet.
 *
 * Day identity = a leading dot in the day's map color (the dot mirrors the
 * pin head, so chip and marker read as the same object; it survives the
 * active state, unlike the retired bottom-border which clipped as "ears").
 * Selection = brand tint (brand-dim bg + brand text) per the button tiers:
 * solid brand is reserved for the screen's main CTA; wayfind stays with
 * map/route/status only.
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
  const cls = `shrink-0 h-11 min-w-[84px] px-4 rounded-full inline-flex items-center justify-center gap-1.5 text-sm font-bold whitespace-nowrap transition-colors border ${
    active ? "" : "bg-muted text-muted-foreground border-border"
  }`;
  const style: React.CSSProperties = active
    ? {
        background: "var(--clr-brand-dim)",
        color: "var(--clr-brand)",
        borderColor: "color-mix(in srgb, var(--clr-brand) 35%, transparent)",
      }
    : {};
  const content = (
    <>
      {dayColor && (
        <span
          aria-hidden
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: dayColor }}
        />
      )}
      {label}
      {count != null && count > 0 && (
        <span className="tabular-nums text-xs font-semibold opacity-70">·{count}</span>
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
