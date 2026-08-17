"use client";

import Link from "next/link";
import { Users, MapPin, Wallet, Package, CalendarDots as CalendarDays, Check, CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/animate-ui/components/radix/accordion";
import { Progress } from "@/components/animate-ui/components/radix/progress";
import { tripReadiness, type ReadinessStepId } from "@/lib/trip-readiness";

/**
 * Phase 7 §5 — the readiness bar. One 52px line above the fold: a thin
 * progress bar + "Trip N% ready". Tap → the checklist springs open
 * (Animate UI Accordion, visual-fix brief H), showing ONLY incomplete
 * steps; completed ones collapse to a single "N done ✓" line. The full
 * 5-row checklist never renders by default.
 *
 * The percentage is NOT a prop. It is derived from the same facts as the
 * step list via `tripReadiness()`, so the bar cannot contradict the
 * checklist it opens — see src/lib/trip-readiness.ts for why that used to
 * happen ("Trip 0% ready" sitting above "1 done ✓" on every new trip).
 */
const STEP_ICON: Record<ReadinessStepId, typeof Users> = {
  dates: CalendarDays,
  crew: Users,
  stops: MapPin,
  budget: Wallet,
  pack: Package,
};

export function ReadinessChecklist({
  base,
  hasDates,
  crewCount,
  stopsCount,
  hasBudget,
  packedCount,
  packTotal,
}: {
  base: string;
  hasDates: boolean;
  crewCount: number;
  stopsCount: number;
  hasBudget: boolean;
  packedCount: number;
  packTotal: number;
}) {
  const t = useT();
  const { steps, doneCount, percent, packingPercent } = tripReadiness({
    hasDates,
    crewCount,
    stopsCount,
    hasBudget,
    packedCount,
    packTotal,
  });
  const incomplete = steps.filter((s) => !s.done);

  return (
    <section className="rounded-2xl bg-card border border-border overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="checklist" className="border-b-0">
          <AccordionTrigger className="h-[52px] items-center gap-3 px-4 py-0 text-start hover:no-underline rounded-none">
            <div className="flex-1 min-w-0 flex items-center gap-3">
              {/* Brief E: spring-animated fill, moss like every progress bar. */}
              <Progress
                value={percent}
                className="flex-1 h-1.5 bg-muted"
                style={{ "--progress-foreground": "var(--clr-moss)" } as React.CSSProperties}
              />
              <span className="text-[13px] font-semibold text-foreground whitespace-nowrap tabular-nums">
                {t("cockpit.tripReady", { percent })}
              </span>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pb-0">
            <div className="flex flex-col gap-2 px-3 pb-3">
          {doneCount > 0 && (
            <p className="text-[13px] text-muted-foreground px-1">
              {t("cockpit.doneCount", { count: doneCount })}
            </p>
          )}
          {incomplete.map((step, i) => {
            const Icon = STEP_ICON[step.id];
            const active = i === 0; // the one active step gets the accent border
            return (
              <Link
                key={step.id}
                href={`${base}${step.path}`}
                className={`flex items-center gap-3 rounded-2xl px-3 bg-muted ${
                  active ? "h-16 border border-primary" : "h-12"
                }`}
              >
                <span className="w-6 h-6 rounded-full border-[1.5px] border-border flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-muted-foreground" />
                </span>
                <span className={`flex-1 text-[15px] ${active ? "font-bold" : "font-medium"} text-foreground`}>
                  {t(step.labelKey)}
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
                  <Check size={16} className="text-success" /> {t("cockpit.allSet")}
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
