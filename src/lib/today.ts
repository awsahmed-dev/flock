/**
 * "What day is it?" — one answer, in one place.
 *
 * THE BUG THIS EXISTS TO KILL
 *
 * `tripPhase` used to take an *instant* (`now: Date = new Date()`) and compare
 * it to boundaries built at *local* midnight. That is internally consistent —
 * every phase transition fires at local midnight on the correct calendar day,
 * in every zone; I scanned it minute by minute to confirm. The defect is that
 * the server's "local" is UTC (Vercel) and the traveller's is not, so the two
 * answer the same question differently:
 *
 *   trip 5–12 Oct 2026, one instant 2026-10-05T01:00Z
 *     server (UTC)      → LIVE
 *     Los Angeles       → DEPARTURE   (wall clock: 4 Oct, 18:00)
 *     Kuala Lumpur      → LIVE        (wall clock: 5 Oct, 09:00)
 *
 * Concretely, both directions hurt:
 *   - LA: the server flips LIVE → RECAP at 2026-10-13T00:00Z, which is 12 Oct
 *     17:00 in LA. The Wrap — a zero-editing recap screen — replaces the live
 *     cockpit mid-dinner on the final evening. The LA *client* would have got
 *     this right; the server overrode it.
 *   - KL: the client flips at 2026-10-12T16:00Z, eight hours before the
 *     server. For that window the client renders RECAP over server HTML that
 *     says LIVE — different labels, different icons, different hrefs.
 *
 * THE FIX
 *
 * Stop comparing instants. A trip's start and end are `date` columns — calendar
 * days with no time and no zone — so the phase is a question about calendar
 * days and nothing else. Resolve "today" to a `YYYY-MM-DD` string ONCE, in the
 * traveller's zone, and pass that string everywhere. Because `YYYY-MM-DD`
 * sorts lexicographically, the comparison needs no Date objects at all — and
 * code that never builds a Date cannot build it in the wrong zone.
 *
 * The traveller's zone reaches the server via the `paxawa_tz` cookie, the same
 * mechanism `paxawa_locale` already uses (see `lib/i18n/index.ts:getLocale`).
 * Absent the cookie we fall back to UTC, which is exactly today's behaviour —
 * so a first-ever request is no worse than before, and every request after it
 * is right.
 *
 * WHOSE calendar? The device's. If it is the 5th where you are standing, your
 * trip is live. A trip that spans zones eventually wants the *destination's*
 * zone, which needs a `trips.time_zone` column — deliberately not invented
 * here. See `docs/timezone-model.md`.
 *
 * This module is pure and imports nothing from `next/*`, so client components
 * can use it too. The cookie read lives in `today-server.ts`.
 */

export const TZ_COOKIE = "paxawa_tz";

/** What we assume when the traveller's zone is unknown. Matches the old behaviour. */
export const FALLBACK_TIME_ZONE = "UTC";

/**
 * Is this a time zone the runtime actually knows? Guards against a spoofed or
 * stale cookie — an unknown zone makes `Intl.DateTimeFormat` throw, and a
 * throw here would take down every trip screen.
 */
export function isTimeZone(zone: string | null | undefined): zone is string {
  if (!zone || zone.length > 64 || !/^[A-Za-z0-9+_\-/]+$/.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The calendar day in `zone` at instant `at`, as "YYYY-MM-DD".
 *
 * Uses `formatToParts` rather than string slicing so it is not at the mercy of
 * a locale's date order. An unknown zone falls back rather than throwing.
 */
export function todayInZone(zone: string, at: Date = new Date()): string {
  const tz = isTimeZone(zone) ? zone : FALLBACK_TIME_ZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Normalise anything date-shaped to a bare "YYYY-MM-DD".
 *
 * Drizzle hands `date` columns back as "YYYY-MM-DD", but a few callers pass a
 * full timestamp by mistake and the old `parseDateOnly` quietly tolerated it.
 * Keep tolerating it — silently, in one place.
 */
export function toIsoDay(value: string | null | undefined): string {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

/**
 * Whole calendar days from `fromIso` to `toIso`. Positive when `toIso` is
 * later. Arithmetic is done in UTC on purpose: both operands are calendar
 * days, so there is no zone involved and no DST to trip over.
 *
 * Replaces `differenceInCalendarDays(Date, Date)`, whose answer depended on
 * the process's zone.
 */
export function diffDaysIso(fromIso: string, toIso: string): number {
  const a = isoToUtcMs(fromIso);
  const b = isoToUtcMs(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

/** `iso` shifted by `n` calendar days, as "YYYY-MM-DD". */
export function addDaysIso(iso: string, n: number): string {
  const ms = isoToUtcMs(iso);
  if (Number.isNaN(ms)) return "";
  return utcMsToIso(ms + n * 86_400_000);
}

/**
 * A "YYYY-MM-DD" for a Date, read in the *host* zone.
 *
 * For client components this is the traveller's own calendar, which is the
 * right answer — but prefer a `todayIso` threaded down from the server so the
 * two renders cannot disagree. Never call this during a render that the server
 * also performs.
 */
export function isoDayOf(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToUtcMs(iso: string): number {
  const ymd = toIsoDay(iso);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

function utcMsToIso(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${dt.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}
