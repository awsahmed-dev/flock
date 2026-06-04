/**
 * Affiliate partner config. IDs are read from env vars so we can swap a
 * "preview mode" set (no real attribution, links still work) for the
 * production set once we're approved by each partner. While we're still
 * mocking, the placeholder IDs let the links open the right destination
 * page even though no commission flows yet.
 *
 * The `label` parameter we pass on every link is the attribution
 * breadcrumb — it's how we'll learn which placement drove which booking
 * when partner reports come back.
 */
export const PARTNERS = {
  booking: {
    // Real Booking.com AID once approved. Placeholder works for link
    // shape preview without earning revenue.
    aid: process.env.NEXT_PUBLIC_BOOKING_AID ?? "preview",
    base: "https://www.booking.com/searchresults.html",
  },
  airalo: {
    // Airalo runs through Impact (impact.com). The link uses our handle
    // in the path. Placeholder kept so the preview deep-links to the
    // right country page without attribution.
    handle: process.env.NEXT_PUBLIC_AIRALO_HANDLE ?? "preview",
    base: "https://www.airalo.com",
  },
  gyg: {
    partnerId: process.env.NEXT_PUBLIC_GYG_PARTNER_ID ?? "preview",
    base: "https://www.getyourguide.com",
  },
} as const;

/** Where the click came from — used as the attribution label. */
export type AffiliateSurface =
  | "trip_overview_hero"
  | "vote_card"
  | "itinerary_day_empty"
  | "ai_plan_result"
  | "itinerary_item"
  | "pack_docs_empty"
  | "trip_overview_esim"
  | "notification";
