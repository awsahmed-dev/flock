"use client";

import Link from "next/link";
import { useState } from "react";
import { Users, MapPin, Wallet, Package, CalendarDots as CalendarDays, Check, CaretRight as ChevronRight, CaretDown as ChevronDown } from "@phosphor-icons/react/dist/ssr";

/**
 * Phase 6 §3-B(3): the Trip Prep checklist.
 *
 * Steps in order — dates · crew · first stops · budget · packing.
 * CRITICAL: "Start packing" completes at packingPercent ≥ 50, NOT on item
 * existence — "All set 🎉" CANNOT render while packing < 50%.
 *
 * Active: shows the next 2 unchecked steps + "+N more".
 * Complete: collapses to ONE 64px row "All set 🎉 — tap to review"
 * (250ms height animation to re-expand).
 */
export function TripPrepChecklist({
  base,
  hasDates,
  crewCount,
  stopsCount,
  hasBudget,
  packedCount,
  packTotal,
  collapsedOnly = false,
}: {
  base: string;
  hasDates: boolean;
  crewCount: number;
  stopsCount: number;
  hasBudget: boolean;
  packedCount: number;
  packTotal: number;
  /** §3-D(4): DEPARTURE renders only the collapsed row. */
  collapsedOnly?: boolean;
}) {
  const packingPercent = packTotal > 0 ? Math.round((packedCount / packTotal) * 100) : 0;
  const steps = [
    { id: "dates", label: "Set your dates", done: hasDates, href: `${base}/settings`, icon: CalendarDays },
    { id: "crew", label: "Invite the crew", done: crewCount > 1, href: `${base}/members`, icon: Users },
    { id: "stops", label: "Add your first stops", done: stopsCount >= 1, href: `${base}/itinerary`, icon: MapPin },
    { id: "budget", label: "Set a budget", done: hasBudget, href: `${base}/settings`, icon: Wallet },
    // §3-B: completes at ≥50% packed — never on mere item existence.
    { id: "pack", label: "Start packing", done: packingPercent >= 50, href: `${base}/pack`, icon: Package },
  ];
  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  const unchecked = steps.filter((s) => !s.done);
  const visible = unchecked.slice(0, 2);
  const moreCount = unchecked.length - visible.length;

  const [expanded, setExpanded] = useState(false);
  const progress = completed / steps.length;
  const R = 20;
  const CIRC = 2 * Math.PI * R;

  const ring = (
    <svg width={52} height={52} viewBox="0 0 52 52" className="shrink-0">
      <circle cx={26} cy={26} r={R} fill="none" className="stroke-muted" strokeWidth={4} />
      <circle
        cx={26}
        cy={26}
        r={R}
        fill="none"
        stroke="var(--clr-moss)"
        strokeWidth={4}
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - progress)}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 500ms ease" }}
      />
      <text x={26} y={30} textAnchor="middle" className="fill-foreground" style={{ fontSize: 13, fontWeight: 700 }}>
        {completed}/{steps.length}
      </text>
    </svg>
  );

  // Collapsed (all done, or DEPARTURE's compact row).
  if ((allDone || collapsedOnly) && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full h-16 flex items-center justify-between px-4 rounded-3xl bg-card border border-border text-start"
      >
        <span className="text-[15px] font-bold text-foreground">
          {allDone ? "All set 🎉 — tap to review" : `Trip prep · ${completed} of ${steps.length} done`}
        </span>
        <span className="flex items-center gap-2">
          {ring}
          <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-3xl p-4 bg-card border border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded
        className="w-full flex items-center justify-between text-start mb-4"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[1.2px] uppercase text-muted-foreground">Trip prep</p>
          <p className="text-[15px] font-bold text-foreground mt-0.5">
            {allDone ? "All set 🎉" : `${completed} of ${steps.length} done`}
          </p>
        </div>
        <span className="flex items-center gap-2">
          {ring}
          {(allDone || collapsedOnly) && (
            <ChevronDown size={18} className="text-muted-foreground rotate-180 transition-transform" />
          )}
        </span>
      </button>

      <div className="flex flex-col gap-2" style={{ transition: "max-height 250ms ease" }}>
        {(expanded ? steps : allDone ? steps : visible).map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 rounded-2xl px-3 h-14 ${
                step.done ? "bg-success/10" : "bg-muted"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-success" : "border-[1.5px] border-border"
                }`}
              >
                {step.done ? (
                  <Check size={14} className="text-white" strokeWidth={2.5} />
                ) : (
                  <Icon size={14} className="text-muted-foreground" />
                )}
              </span>
              <span
                className={`text-[15px] font-medium ${
                  step.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {step.label}
                {step.id === "pack" && !step.done && packTotal > 0 && (
                  <span className="text-muted-foreground font-normal"> · {packingPercent}%</span>
                )}
              </span>
              {!step.done && <ChevronRight size={16} className="ms-auto text-tertiary rtl:rotate-180" />}
            </Link>
          );
        })}
        {!expanded && !allDone && moreCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-start text-[13px] font-semibold text-muted-foreground px-3 py-1"
          >
            +{moreCount} more
          </button>
        )}
      </div>
    </section>
  );
}
