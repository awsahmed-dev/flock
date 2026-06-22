"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  /** Stable value used for selection + keys. */
  value: T;
  /** Visible label. */
  label: string;
  /** Optional leading icon (lucide component). Rendered at 16px. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional trailing count badge (e.g. unread / item counts). */
  count?: number;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * Layout. "fill" stretches each segment to share the full width (the
   * mobile default — biggest possible tap targets). "auto" hugs the
   * content (use when the control sits inline beside other chrome).
   */
  layout?: "fill" | "auto";
  /** Accessible group label for screen readers. */
  "aria-label"?: string;
  className?: string;
}

/**
 * Canonical segmented control (the "lens" toggle) — one shared primitive so
 * every surface (Pack, Balances, Decisions, Bookings, …) reads identically and
 * meets the touch-target bar.
 *
 * Sizing is deliberately generous: the track is `p-1` and each segment is
 * `py-2 text-[13px]`, so a segment is ~40px tall — at or above the 40px hit
 * area the design system requires. Icons render at 16px (`w-4 h-4`), not the
 * sub-16px sizes the old hand-rolled toggles used. Active segment lifts onto a
 * `bg-card` chip with a hairline ring + shadow so the selection is obvious.
 *
 * RTL-safe (logical gap/padding only) and exposes `role="tablist"` /
 * `aria-pressed` so the toggle is keyboard- and SR-navigable.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layout = "fill",
  "aria-label": ariaLabel,
  className,
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl bg-muted/60 p-1",
        layout === "fill" && "flex w-full",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors",
              layout === "fill" && "flex-1",
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span className="truncate">{opt.label}</span>
            {opt.count != null && opt.count > 0 && (
              <span
                className={cn(
                  "min-w-[20px] rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none",
                  active ? "bg-primary/10 text-primary" : "bg-foreground/10 text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
