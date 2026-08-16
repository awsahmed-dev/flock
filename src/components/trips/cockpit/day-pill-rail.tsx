"use client";

import { format as dfFormat } from "@/lib/i18n/date-fns";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { ChipRail } from "@/components/ui/chip-rail";
import { DayChip } from "@/components/trips/day-chip";
import { getDayColor } from "@/lib/day-colors";

/**
 * Phase 6 §3-B(4) — the itinerary strip: a horizontal day-pill rail.
 * Today (if inside the trip) is filled accent; other days are quiet
 * surfaces with accent text (§7.1: no purple picket fence).
 *
 * PLANNING only renders this once the trip has at least one stop.
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
    /* The "Plan days →" row that used to head this section is gone: it was a
       third control pointing at /itinerary on a screen whose primary action
       already goes there. The chips are the rail. */
    <section>
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
