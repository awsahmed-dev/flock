/**
 * B14: timezone-safe parser for the calendar dates we store in
 * `trips.start_date` / `trips.end_date` / `expenses.expense_date` /
 * `itinerary_items.day_date`. These columns are Postgres `date` (no
 * time, no timezone) and Drizzle hands them back as "YYYY-MM-DD"
 * strings.
 *
 * The bug we're fixing: `parseISO("2026-07-10")` interprets the
 * string as `2026-07-10T00:00:00Z` (UTC midnight). When the viewer
 * is in a negative-offset zone — Pacific time, Hawaii, anywhere in
 * the Americas — formatting that Date in local time shifts to the
 * previous calendar day. So a Member in California seeing a trip
 * the Owner created as "Jul 10 – Jul 17" saw "Jul 9 – Jul 16".
 *
 * The fix is to build the Date in the viewer's local zone instead:
 * `new Date(y, m-1, d)` creates a Date at local midnight on that
 * calendar day, which `format()` always renders correctly.
 *
 * Use this in place of `parseISO(...)` for every `date`-typed column
 * that comes off the DB. Continue to use `parseISO` for full
 * timestamps (`created_at`, `expense_date` if it ever gets a time
 * component, etc.).
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
