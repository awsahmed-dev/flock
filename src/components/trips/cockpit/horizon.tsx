"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Airplane } from "@phosphor-icons/react/dist/ssr";

/**
 * Now redesign, step 3 — the Horizon: time as SPACE.
 *
 * One glass instrument. A rail from "now" toward the plane; each due-item is a
 * node placed WHERE it sits in time, carrying a state colour (later grey · due
 * orange · done green, done also filled). Pre-trip the axis is
 * days-to-departure; LIVE it is today's stops; RECAP the whole trip. Replaces
 * the "N% ready" bar — readiness is whatever is still ahead of the dot.
 *
 * THE RAIL IS SEGMENTS, NOT ONE BAR. Every node punches a 16px hole on each
 * side, so no line is ever drawn under an icon. The earlier version ran a
 * continuous bar behind the nodes and tried to hide it with a card-coloured
 * ring on each chip; that only masks outside the chip's circle, and the rail's
 * own glow bled over it anyway — the line visibly crossed the icons. Segments
 * make the gap real rather than painted over.
 *
 * Losing the bar also loses the chip circles, which is what the height was
 * going into: the 68px version stacked a 28px chip ABOVE the rail and then
 * spent a 15px stem and a tick dot pushing the label clear of the now-dot's
 * glow — 21px of padding around a collision. Bare icons sit ON the line, one
 * centre at y=14 shared by the segments, the nodes, the dot and the plane.
 *
 * "Now" landing on a node is the case that breaks naive steppers: an item due
 * today sits at exactly the dot's position by construction. Rather than stack
 * a disc over the icon, that node wears a horizon ring and the free dot is not
 * drawn — and it KEEPS its own state colour, so an item that is done still
 * reads done rather than being repainted "current".
 *
 * The axis is left→right in both directions (time reads that way in the
 * Arabic app too — the crew, the itinerary board and the calendar already
 * do), so the strip is dir="ltr" while its labels stay in the page language.
 */
export type HorizonMarkState = "later" | "due" | "done" | "now";

export interface HorizonMark {
  /** 0–100 along the rail */
  at: number;
  label: string;
  icon: ComponentType<{ size?: number; weight?: "fill" | "regular"; style?: React.CSSProperties }>;
  state: HorizonMarkState;
  href?: string;
}

const COLOR: Record<HorizonMarkState, string> = {
  later: "color-mix(in srgb, var(--foreground) 35%, transparent)",
  due: "var(--clr-horizon)",
  done: "var(--clr-moss)",
  now: "var(--clr-horizon)",
};

/**
 * Where a segment has to stop, measured from the node's CENTRE — so it is the
 * node's own radius plus the air we want around it. The "now" node is wider
 * than the rest because it wears a 28px ring, and sizing every gap to the
 * 20px icon left the rail ending 2px off that ring: from a arm's length the
 * line simply ran into the icon.
 */
const GAP_ICON = 10 + 8;   // 20px icon
const GAP_RING = 14 + 8;   // 28px "you are here" ring
const GAP_DOT = 12 + 6;    // 12px now-dot inside its halo
/**
 * Two nodes can fall close enough that what is left between their gaps is a
 * 4px nub, which reads as a stray dot rather than a line. No fixed pixel gap
 * avoids this at every rail width, so measure the rail and drop the runts —
 * two neighbours then simply share one wider gap.
 */
const MIN_SEG = 10;

export function Horizon({
  title, nowLabel, progress, marks, endIcon: End = Airplane, className = "",
}: {
  title: string;
  nowLabel: string;
  /** 0–100 */
  progress: number;
  marks: HorizonMark[];
  endIcon?: ComponentType<{ size?: number; weight?: "fill" | "regular"; style?: React.CSSProperties }>;
  className?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [railW, setRailW] = useState(0);
  useEffect(() => {
    const el = rail.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setRailW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const p = Math.max(0, Math.min(100, progress));
  // A node close enough to the dot that the two would collide wears the ring
  // instead, and the free dot is not drawn. The test is in PIXELS, not a fixed
  // percentage: at 6% of a 460px rail two things sit 28px apart and are fine,
  // at 6% of a 340px rail they are 20px apart and overlap. Before the rail is
  // measured, fall back to the percentage that is safe at the narrow end.
  const nowOn = marks.findIndex((m) =>
    railW
      ? (Math.abs(m.at - p) / 100) * railW < GAP_DOT + GAP_ICON
      : Math.abs(m.at - p) < 11,
  );
  // Segment boundaries: the start, every node, then the plane at 100. Each
  // carries the gap ITS node needs, so a ringed node pushes the rail further
  // back than a bare one.
  // The free-standing now-dot is a boundary too, not something laid over a
  // segment: overlaid, it left a sliver of rail poking out either side of its
  // halo. As a boundary the segment simply ends at it — which also means the
  // travelled/ahead split falls exactly on a segment edge.
  const atNow = nowOn === -1 ? null : marks[nowOn].at;
  const stops: { at: number; gap: number }[] = [
    { at: 0, gap: 0 },
    ...marks.map((m) => ({ at: m.at, gap: m.at === atNow ? GAP_RING : GAP_ICON })),
    ...(nowOn === -1 ? [{ at: p, gap: GAP_DOT }] : []),
    { at: 100, gap: GAP_ICON },
  ].sort((a, b) => a.at - b.at);

  return (
    <section className={`now-rise now-rise-2 rounded-3xl border border-border bg-card px-4 pt-2.5 pb-2.5 ${className}`} aria-label={title}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-muted-foreground">{title}</p>
        <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: "var(--clr-horizon)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--clr-horizon)" }} />
          {nowLabel}
        </span>
      </div>
      {/* 48px. One centre line at y=14: segments (h-1.5 at top-11), the 20px
          icons (y 4..24), the 12px dot (top-8) and the plane all share it;
          labels hang at y=30. */}
      <div className="relative h-[48px] ps-3 pe-8" dir="ltr">
        <div ref={rail} className="absolute inset-y-0 left-3 right-8">
          {stops.slice(0, -1).map(({ at: a, gap: lead }, i) => {
            const { at: b, gap: trail } = stops[i + 1];
            const span = b - a;
            // Before the rail has been measured (SSR, first paint) draw them
            // all; the runts blink out on mount rather than never appearing.
            if (railW && (span / 100) * railW - lead - trail < MIN_SEG) return null;
            // How much of THIS segment is behind us. A negative width is
            // clamped to 0 by CSS, so near-coincident nodes just drop out.
            const done = span > 0 ? Math.max(0, Math.min(1, (p - a) / span)) : 0;
            // moss → dune across the runway, sampled at the segment's middle.
            const col = `color-mix(in srgb, var(--clr-dune) ${Math.round((a + b) / 2)}%, var(--clr-moss))`;
            return (
              <span
                key={`${a}-${b}`}
                className="absolute top-[11px] h-1.5 rounded-full overflow-hidden bg-foreground/[0.10]"
                style={{ left: `calc(${a}% + ${lead}px)`, width: `calc(${span}% - ${lead + trail}px)` }}
              >
                {done > 0 && (
                  <span
                    className="now-track block h-full rounded-full"
                    style={{ width: `${done * 100}%`, background: col, boxShadow: `0 0 10px color-mix(in srgb, ${col} 45%, transparent)` }}
                  />
                )}
              </span>
            );
          })}

          {nowOn === -1 && (
            <div
              className="now-pop absolute top-[8px] -ms-[6px] w-3 h-3 rounded-full z-[3]"
              style={{ left: `${p}%`, animationDelay: "1050ms", background: "var(--clr-horizon)", boxShadow: "0 0 0 5px color-mix(in srgb, var(--clr-horizon) 22%, transparent), 0 0 16px color-mix(in srgb, var(--clr-horizon) 65%, transparent)" }}
            >
              <span className="absolute inset-0 rounded-full animate-ping motion-reduce:animate-none" style={{ background: "color-mix(in srgb, var(--clr-horizon) 40%, transparent)" }} />
            </div>
          )}

          {marks.map((m, i) => {
            const I = m.icon;
            const col = COLOR[m.state];
            const here = i === nowOn;
            const body = (
              <>
                {here && (
                  <span
                    className="absolute -top-1 start-1/2 -ms-[14px] w-7 h-7 rounded-full -z-10"
                    style={{ border: "1.5px solid var(--clr-horizon)", boxShadow: "0 0 12px color-mix(in srgb, var(--clr-horizon) 45%, transparent)" }}
                  />
                )}
                <I size={20} weight={m.state === "done" ? "fill" : "regular"} style={{ color: col }} />
                <span className="mt-1.5 text-[10px] leading-[14px] whitespace-nowrap font-semibold" style={{ color: here ? "var(--clr-horizon)" : col }}>{m.label}</span>
              </>
            );
            // px-2/py-1 grows the tap target; NO negative margins to cancel them.
            // An absolutely positioned node pulls no siblings around, so the
            // old `-mx-2` bought nothing and cost everything: it shifted each
            // node 8px off its own percentage, which is half the gap — the
            // segment then ran over the icon on one side.
            const cls = `now-pop now-pop-${Math.min(4, i + 1)} absolute -translate-x-1/2 top-0 z-[2] flex flex-col items-center px-2 py-1`;
            return m.href
              ? <Link key={m.label} href={m.href} className={cls} style={{ left: `${m.at}%` }} aria-label={m.label}>{body}</Link>
              : <div key={m.label} className={cls} style={{ left: `${m.at}%` }}>{body}</div>;
          })}

          <span className="absolute left-full top-1 -translate-x-1/2 z-[2]">
            <End size={20} weight="fill" style={{ color: "color-mix(in srgb, var(--foreground) 55%, transparent)" }} />
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Where does "N days out" sit on a pre-trip horizon? Square-root easing over a
 * 60-day runway so the last two weeks — where everything is due — get room:
 *   T−49 → 10%   T−14 → 52%   T−7 → 66%   T−2 → 82%   T−0 → 100%
 */
export const RUNWAY_DAYS = 60;
export function runwayPos(daysOut: number): number {
  const d = Math.max(0, Math.min(RUNWAY_DAYS, daysOut));
  return Math.round((1 - Math.sqrt(d / RUNWAY_DAYS)) * 100);
}
