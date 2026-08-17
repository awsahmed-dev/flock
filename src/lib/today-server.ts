import { cookies } from "next/headers";
import { FALLBACK_TIME_ZONE, TZ_COOKIE, isTimeZone, todayInZone } from "@/lib/today";

/**
 * Server-side resolution of the traveller's calendar.
 *
 * Deliberately shaped like `getLocale()` in `lib/i18n/index.ts`, because it is
 * the same problem: a per-viewer preference the server has to know before it
 * can render. Cookie set by `<TimeZoneSync />` on the client; UTC when absent.
 *
 * Split from `today.ts` so client components can import the pure helpers
 * without dragging `next/headers` in.
 */

/** The traveller's IANA zone, or UTC if we haven't been told yet. */
export async function getTimeZone(): Promise<string> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(TZ_COOKIE)?.value;
  return isTimeZone(fromCookie) ? fromCookie : FALLBACK_TIME_ZONE;
}

/**
 * Today, as "YYYY-MM-DD", in the traveller's zone.
 *
 * Call this ONCE per render and thread the string down. Two calls in the same
 * request can straddle midnight and reintroduce the disagreement this whole
 * module exists to remove.
 */
export async function getToday(): Promise<string> {
  return todayInZone(await getTimeZone());
}
