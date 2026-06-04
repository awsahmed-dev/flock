import { PARTNERS, type AffiliateSurface } from "./partners";

/**
 * Booking.com hotel search deep link, prefilled with trip context.
 * Booking accepts `aid` (affiliate id), `label` (free-form attribution
 * string), and the usual search params. Currency + locale are passed so
 * the destination page renders in the same context as the user's trip.
 */
export function buildBookingLink(args: {
  destination: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  members: number;
  surface: AffiliateSurface;
  tripId: string;
  currency?: string;
  locale?: "en" | "ar";
}) {
  const params = new URLSearchParams({
    aid: PARTNERS.booking.aid,
    label: `paxawa-${args.surface}-${args.tripId}`,
    ss: args.destination,
    checkin: args.startDate,
    checkout: args.endDate,
    group_adults: String(args.members),
    no_rooms: "1",
  });
  if (args.currency) params.set("selected_currency", args.currency);
  if (args.locale === "ar") params.set("lang", "ar");
  return `${PARTNERS.booking.base}?${params.toString()}`;
}

/**
 * Airalo country deep link. Airalo's affiliate path uses the
 * impact.com short link format: airalo.pxf.io/<handle>/<country-slug>.
 * The country slug is derived from a country name; we keep a small map
 * for the destinations our testers are most likely to plan around. New
 * countries fall back to the main store page (still attributed).
 */
const AIRALO_COUNTRY_SLUGS: Record<string, string> = {
  malaysia: "malaysia",
  japan: "japan",
  "saudi arabia": "saudi-arabia",
  uae: "united-arab-emirates",
  "united arab emirates": "united-arab-emirates",
  turkey: "turkey",
  thailand: "thailand",
  indonesia: "indonesia",
  egypt: "egypt",
  "united kingdom": "united-kingdom",
  uk: "united-kingdom",
  france: "france",
  italy: "italy",
  spain: "spain",
  germany: "germany",
};

/** Crude destination → country detection. We look at the last token of
 *  the destination string ("Kuala Lumpur, Malaysia" → "malaysia"). If the
 *  user just wrote a city we don't try to be clever — return null and
 *  let the caller decide whether to surface the banner. */
export function detectCountryForAiralo(destination: string): string | null {
  const tail = destination.split(",").pop()?.trim().toLowerCase();
  if (!tail) return null;
  return AIRALO_COUNTRY_SLUGS[tail] ?? null;
}

export function buildAiraloLink(args: {
  destination: string;
  surface: AffiliateSurface;
  tripId: string;
}) {
  const slug = detectCountryForAiralo(args.destination);
  // impact.com appends our handle + a `subid` param we use for attribution.
  // No slug → fall back to global store with the same subid.
  const subid = `paxawa-${args.surface}-${args.tripId}`;
  const path = slug ? `/${slug}` : "";
  return (
    `https://airalo.pxf.io/c/${PARTNERS.airalo.handle}${path}` +
    `?subId1=${encodeURIComponent(subid)}`
  );
}
