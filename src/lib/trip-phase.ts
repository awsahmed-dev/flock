import { diffDaysIso, toIsoDay } from "@/lib/today";

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
 * `todayIso` is REQUIRED and is a calendar day ("YYYY-MM-DD"), not an instant.
 *
 * It used to default to `new Date()`, and that default was the bug: the server
 * runs in UTC and the traveller does not, so server and client answered this
 * question differently for up to 15 hours a day. The full account, with the
 * reproduction, is at the top of `lib/today.ts`.
 *
 * Server callers get `todayIso` from `getToday()` (`lib/today-server.ts`).
 * Client callers must receive it as a prop from a server component — they must
 * NOT compute it, or the two renders can disagree again and we are back where
 * we started. There is no default value on purpose: an omitted argument is now
 * a type error rather than a silent 15-hour window of wrongness.
 *
 * Both operands are calendar days, so the comparison is a string comparison —
 * "YYYY-MM-DD" sorts lexicographically. No Date is constructed anywhere in
 * this function, which is what makes it impossible to construct one in the
 * wrong zone.
 */
export type TripPhase = "PLANNING" | "DEPARTURE" | "LIVE" | "RECAP";

export function tripPhase(
  trip: { startDate: string; endDate: string },
  todayIso: string,
): TripPhase {
  const today = toIsoDay(todayIso);
  const start = toIsoDay(trip.startDate);
  const end = toIsoDay(trip.endDate);

  if (today > end) return "RECAP";
  if (today >= start) return "LIVE";
  if (diffDaysIso(today, start) <= 7) return "DEPARTURE";
  return "PLANNING";
}
