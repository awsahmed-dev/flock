import Link from "next/link";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";
import { ChipRail } from "@/components/ui/chip-rail";
import { DayChip } from "@/components/trips/day-chip";
import { getDayColor } from "@/lib/day-colors";

/**
 * Phase 6 §3-B(4) — the itinerary strip: a "Plan days →" full-width row
 * plus a horizontal day-pill rail. Today (if inside the trip) is filled
 * accent; other days are quiet surfaces with accent text (§7.1: no purple
 * picket fence).
 */
export function DayPillRail({
  tripId,
  days,
  stopCountByDay,
}: {
  tripId: string;
  days: string[];
  stopCountByDay: Record<string, number>;
}) {
  const base = `/trips/${tripId}`;
  const todayIso = isoFmt(new Date(), "yyyy-MM-dd");

  return (
    <section>
      <Link
        href={`${base}/itinerary`}
        className="flex items-center justify-between h-[52px] px-4 rounded-2xl bg-card border border-border font-bold text-[15px] text-foreground active:scale-[0.99] transition-transform"
      >
        Plan days
        <ChevronRight size={18} className="text-muted-foreground rtl:rotate-180" />
      </Link>
      {days.length > 0 && (
        /* Sprint 8 Items 2+4: same DayChip as the LIVE rail (44px pill,
           day-color bottom border) with the trailing scroll fade. */
        <ChipRail className="flex gap-2 pt-3 pb-1">
          {days.map((d, idx) => (
            <DayChip
              key={d}
              href={`${base}/itinerary?day=${d}`}
              active={d === todayIso}
              dayColor={getDayColor(idx)}
              count={stopCountByDay[d] ?? 0}
              label={dfFormat(parseDateOnly(d), "EEE d")}
            />
          ))}
        </ChipRail>
      )}
    </section>
  );
}
