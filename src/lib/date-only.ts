/**
 * B14: parser for the calendar dates we store in `trips.start_date` /
 * `trips.end_date` / `expenses.expense_date` / `itinerary_items.day_date`.
 * These columns are Postgres `date` (no time, no timezone) and Drizzle
 * hands them back as "YYYY-MM-DD" strings.
 *
 * CORRECTION (fix/tz). The comment that used to live here was factually
 * wrong, and wrong in a way that sent maintainers hunting the wrong thing
 * for a year. It claimed:
 *
 *   "parseISO("2026-07-10") interprets the string as 2026-07-10T00:00:00Z
 *    (UTC midnight)"
 *
 * It does not. Verified against this repo's own date-fns@4.1.0:
 *
 *   TZ=UTC          parseISO("2026-07-10") -> 2026-07-10T00:00:00.000Z
 *   TZ=Asia/Riyadh  parseISO("2026-07-10") -> 2026-07-09T21:00:00.000Z
 *   TZ=America/L_A  parseISO("2026-07-10") -> 2026-07-10T07:00:00.000Z
 *
 * All three are LOCAL midnight on 10 July — which is the same thing this
 * function returns. `parseISO` on a date-only string was never the bug.
 *
 * The genuinely unsafe pattern is the BARE CONSTRUCTOR:
 *
 *   TZ=anything     new Date("2026-07-10")  -> 2026-07-10T00:00:00.000Z
 *
 * which is UTC midnight in every zone, so reading it back with local
 * getters shifts the day one earlier everywhere east of Greenwich. If you
 * are looking for date bugs, grep for `new Date(<a date-only string>)`,
 * not for `parseISO`.
 *
 * WHY THIS FUNCTION STILL EXISTS: it is explicit about intent, and it
 * tolerates a caller that hands over a full timestamp by mistake. Keep
 * using it for `date`-typed columns; keep using `parseISO` for real
 * timestamps (`created_at`).
 *
 * BUT PREFER NOT NEEDING IT AT ALL. Turning a calendar day into a Date so
 * you can compare it against `new Date()` is the root of the whole fix/tz
 * cluster — see the top of `lib/today.ts`. For comparisons, countdowns and
 * "is this today", stay in "YYYY-MM-DD" strings and use `toIsoDay`,
 * `diffDaysIso` and `addDaysIso`. Reach for `parseDateOnly` only when you
 * genuinely need a Date to hand to `format()` for display.
 */
export function parseDateOnly(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  // Some callers send a full ISO timestamp by mistake — peel off
  // anything past the date portion and we still come out right.
  const ymd = s.slice(0, 10);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}
