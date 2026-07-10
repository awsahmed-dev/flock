import { differenceInCalendarDays, startOfDay, endOfDay } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";

/**
 * Phase 6 §2: the trip phase engine — THE single source of truth for
 * "what phase is this trip in?". Nothing else computes phases; import
 * and call this everywhere (NOW cockpit, NavPill, Discover header,
 * [+] behavior, cold-start routing, Pocket Day).
 *
 *   PLANNING   more than 7 days out
 *   DEPARTURE  within 7 days of the start
 *   LIVE       between start and end (inclusive)
 *   RECAP      after the end date
 *
 * Dates are date-only columns; parseDateOnly avoids the UTC-midnight
 * off-by-one that `new Date("2026-07-10")` causes in non-UTC zones.
 */
export type TripPhase = "PLANNING" | "DEPARTURE" | "LIVE" | "RECAP";

export function tripPhase(
  trip: { startDate: string; endDate: string },
  now: Date = new Date(),
): TripPhase {
  const start = startOfDay(parseDateOnly(trip.startDate));
  const end = endOfDay(parseDateOnly(trip.endDate));
  if (now > end) return "RECAP";
  if (now >= start) return "LIVE";
  if (differenceInCalendarDays(start, now) <= 7) return "DEPARTURE";
  return "PLANNING";
}
