/**
 * Paxawa v2 — Google Places spend meter + kill-switch.
 *
 * All-in Google means every uncached call costs money, so the proxy keeps a
 * rough per-day call counter per SKU and a hard daily cap. When the cap trips,
 * `isOverCap()` returns true and the proxy degrades to cache-only — it stops
 * hitting Google entirely until the next UTC day. This is the operational
 * safety net from docs/v2-discovery-planning.md §5.4 / build-spec.
 *
 * In-memory per instance (resets on deploy). A future hardening moves the
 * counter to a shared store (Postgres/Redis) so the cap is global, not
 * per-instance — but per-instance is a real floor of protection on day one.
 */

/** Billable call kinds, roughly matching the New Places SKU tiers. */
export type PlacesSku =
  | "autocomplete" // session-billed; cheapest
  | "text_search"
  | "nearby_search"
  | "details_list" // Pro-tier field mask
  | "details_full" // Enterprise(+Atmosphere) field mask
  | "photo";

/** Daily hard cap on total billable Google calls per instance. Tune against
 *  real spend once we can see the numbers. Override with PLACES_DAILY_CAP. */
const DAILY_CAP = Number(process.env.PLACES_DAILY_CAP ?? 20_000);

let day = utcDay();
const counts: Record<PlacesSku, number> = {
  autocomplete: 0,
  text_search: 0,
  nearby_search: 0,
  details_list: 0,
  details_full: 0,
  photo: 0,
};

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollIfNewDay() {
  const today = utcDay();
  if (today !== day) {
    day = today;
    (Object.keys(counts) as PlacesSku[]).forEach((k) => (counts[k] = 0));
  }
}

/** Total billable calls today. */
export function totalCallsToday(): number {
  rollIfNewDay();
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

/** True when the daily cap is reached — proxy should serve cache-only. */
export function isOverCap(): boolean {
  return totalCallsToday() >= DAILY_CAP;
}

/** Record one billable Google call. Call this only on a real (uncached) hit. */
export function trackCall(sku: PlacesSku, n = 1): void {
  rollIfNewDay();
  counts[sku] += n;
}

/** Snapshot for a future admin/monitoring surface. */
export function spendSnapshot() {
  rollIfNewDay();
  return { day, cap: DAILY_CAP, total: totalCallsToday(), bySku: { ...counts } };
}
