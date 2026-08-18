"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { Airplane } from "@phosphor-icons/react/dist/ssr";

/**
 * Now redesign, step 3 — the Horizon: time as SPACE.
 *
 * One glass instrument. A track from "now" toward the plane; a glowing,
 * pulsing now-dot; each due-item is a mark placed WHERE it sits in time with
 * an icon above and a state colour below (later grey · due orange · done
 * green). Pre-trip the axis is days-to-departure; LIVE it is today's stops;
 * RECAP the whole trip. Replaces the "N% ready" bar — readiness is whatever
 * is still ahead of the dot.
 *
 * The axis is left→right in both directions (time reads that way in the
 * Arabic app too — the crew, the itinerary board and the calendar already
 * do), so the strip is dir="ltr" while its labels stay in the page language.
 */
export type HorizonMarkState = "later" | "due" | "done" | "now";

export interface HorizonMark {
  /** 0–100 along the track */
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

export function Horizon({
  title, nowLabel, progress, marks, endIcon: End = Airplane, className = "",
}: {
  title: string;
  nowLabel: string;
  /** 0–100 */
  progress: number;
  marks: HorizonMark[];
  endIcon?: ComponentType<{ size?: number; weight?: "fill" | "regular"; className?: string }>;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <section className={`now-rise now-rise-2 rounded-3xl border border-border bg-card px-4 pt-3 pb-3 ${className}`} aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-black tracking-[0.18em] uppercase text-muted-foreground">{title}</p>
        <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: "var(--clr-horizon)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--clr-horizon)" }} />
          {nowLabel}
        </span>
      </div>
      {/* The strip: marks above the track, labels below; the plane is the
          track's own terminus (inside the panel), so nothing pokes out. */}
      <div className="relative h-[68px] ps-3 pe-11" dir="ltr">
        <div className="absolute inset-y-0 left-3 right-11">
          <div className="absolute inset-x-0 top-[30px] h-1.5 rounded-full bg-foreground/[0.08]" />
          <div
            className="now-track absolute top-[30px] h-1.5 rounded-full"
            style={{ left: 0, width: `${p}%`, background: "linear-gradient(90deg, var(--clr-moss) 0%, var(--clr-moss) 60%, var(--clr-dune) 100%)", boxShadow: "0 0 14px color-mix(in srgb, var(--clr-moss) 40%, transparent)" }}
          />
          <div className="now-pop absolute top-[21px] -translate-x-1/2 z-10" style={{ left: `${p}%`, animationDelay: "1050ms" }}>
            <div className="relative w-6 h-6 rounded-full" style={{ background: "var(--clr-horizon)", boxShadow: "0 0 0 6px color-mix(in srgb, var(--clr-horizon) 22%, transparent), 0 0 20px color-mix(in srgb, var(--clr-horizon) 60%, transparent)" }}>
              <span className="absolute inset-0 rounded-full animate-ping motion-reduce:animate-none" style={{ background: "color-mix(in srgb, var(--clr-horizon) 40%, transparent)" }} />
            </div>
          </div>
          {marks.map((m, i) => {
            const I = m.icon;
            const col = COLOR[m.state];
            const chip = m.state === "due" ? "color-mix(in srgb, var(--clr-horizon) 15%, transparent)" : m.state === "done" ? "color-mix(in srgb, var(--clr-moss) 15%, transparent)" : "var(--card)";
            const body = (
              <>
                <span className="w-7 h-7 rounded-full flex items-center justify-center border" style={{ background: chip, borderColor: m.state === "later" ? "color-mix(in srgb, var(--foreground) 15%, transparent)" : col }}>
                  <I size={13} weight={m.state === "done" ? "fill" : "regular"} style={{ color: col }} />
                </span>
                <span className="mt-[15px] w-1.5 h-1.5 rounded-full" style={{ background: col }} />
                <span className="mt-1 text-[10px] whitespace-nowrap font-semibold" style={{ color: col }}>{m.label}</span>
              </>
            );
            const cls = `now-pop now-pop-${Math.min(4, i + 1)} absolute -translate-x-1/2 flex flex-col items-center px-2 -mx-2 py-1 -my-1`;
            return m.href
              ? <Link key={m.label} href={m.href} className={cls} style={{ left: `${m.at}%`, top: 0 }} aria-label={m.label}>{body}</Link>
              : <div key={m.label} className={cls} style={{ left: `${m.at}%`, top: 0 }}>{body}</div>;
          })}
        </div>
        <div className="absolute right-0 top-[18px] w-8 h-8 rounded-full border border-border bg-foreground/[0.06] flex items-center justify-center">
          <End size={14} weight="fill" className="text-foreground/80" />
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
