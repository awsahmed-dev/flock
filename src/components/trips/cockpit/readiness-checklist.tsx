"use client";

import Link from "next/link";
import { useState } from "react";
import { Users, MapPin, Wallet, Package, CalendarDays, Check, ChevronRight, ChevronDown } from "lucide-react";

/**
 * Phase 7 §5 — the readiness bar. One 52px line above the fold: a thin
 * progress bar + "Trip N% ready". Tap → the checklist slides open (250ms),
 * showing ONLY incomplete steps; completed ones collapse to a single
 * "N done ✓" line. The full 5-row checklist never renders by default.
 */
export function ReadinessChecklist({
  base,
  readiness,
  hasDates,
  crewCount,
  stopsCount,
  hasBudget,
  packedCount,
  packTotal,
}: {
  base: string;
  readiness: number;
  hasDates: boolean;
  crewCount: number;
  stopsCount: number;
  hasBudget: boolean;
  packedCount: number;
  packTotal: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const packingPercent = packTotal > 0 ? Math.round((packedCount / packTotal) * 100) : 0;
  const steps = [
    { id: "dates", label: "Set your dates", done: hasDates, href: `${base}/settings`, icon: CalendarDays },
    { id: "crew", label: "Invite the crew", done: crewCount > 1, href: `${base}/members`, icon: Users },
    { id: "stops", label: "Add your first stops", done: stopsCount >= 1, href: `${base}/itinerary`, icon: MapPin },
    { id: "budget", label: "Set a budget", done: hasBudget, href: `${base}/settings`, icon: Wallet },
    { id: "pack", label: "Start packing", done: packingPercent >= 50, href: `${base}/pack`, icon: Package },
  ];
  const incomplete = steps.filter((s) => !s.done);
  const doneCount = steps.length - incomplete.length;

  return (
    <section className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full h-[52px] flex items-center gap-3 px-4 text-start"
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700"
              style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold text-foreground whitespace-nowrap tabular-nums">
            Trip {readiness}% ready
          </span>
        </div>
        <ChevronDown
          size={16}
          className="text-muted-foreground shrink-0 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        />
      </button>

      <div
        className="overflow-hidden"
        style={{ maxHeight: expanded ? 420 : 0, transition: "max-height 250ms ease" }}
      >
        <div className="flex flex-col gap-2 px-3 pb-3">
          {doneCount > 0 && (
            <p className="text-[13px] text-muted-foreground px-1">
              {doneCount} done ✓
            </p>
          )}
          {incomplete.map((step, i) => {
            const Icon = step.icon;
            const active = i === 0; // the one active step gets the accent border
            return (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-3 rounded-2xl px-3 bg-muted ${
                  active ? "h-16 border border-primary" : "h-12"
                }`}
              >
                <span className="w-6 h-6 rounded-full border-[1.5px] border-border flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-muted-foreground" />
                </span>
                <span className={`flex-1 text-[15px] ${active ? "font-bold" : "font-medium"} text-foreground`}>
                  {step.label}
                  {step.id === "pack" && packTotal > 0 && (
                    <span className="text-muted-foreground font-normal"> · {packingPercent}%</span>
                  )}
                </span>
                <ChevronRight size={16} className="text-tertiary rtl:rotate-180" />
              </Link>
            );
          })}
          {incomplete.length === 0 && (
            <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground px-1 py-2">
              <Check size={16} className="text-success" /> All set 🎉
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
