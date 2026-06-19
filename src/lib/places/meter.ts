/**
 * Paxawa v2 — Google Places spend meter + kill-switch.
 *
 * All-in Google means every uncached call costs money, so the proxy keeps a
 * per-day call counter per SKU and a hard daily cap. When the cap trips,
 * `isOverCap()` returns true and the proxy degrades to cache-only — it stops
 * hitting Google entirely until the next UTC day. The operational safety net
 * from docs/v2-discovery-planning.md §5.4.
 *
 * Two layers:
 *   1. **in-memory** (per serverless instance) — instant, but resets on deploy
 *      and never aggregates across instances. A fast floor.
 *   2. **`places_spend` (Postgres)** — the global source of truth, so the daily
 *      cap actually aggregates across every instance. This is the hardening the
 *      planning doc named. DB total is memoized briefly to keep reads cheap.
 *
 * Tracking writes are fire-and-forget: telemetry must never slow or break a
 * request. The cap read is `await`ed at route entry (routes are already async).
 */

import "server-only";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { placesSpend } from "@/lib/db/schema";

/** Billable call kinds, roughly matching the New Places SKU tiers. */
export type PlacesSku =
  | "autocomplete" // session-billed; cheapest
  | "text_search"
  | "nearby_search"
  | "details_list" // Pro-tier field mask
  | "details_full" // Enterprise(+Atmosphere) field mask
  | "photo";

const SKUS: PlacesSku[] = [
  "autocomplete",
  "text_search",
  "nearby_search",
  "details_list",
  "details_full",
  "photo",
];

/** Daily hard cap on total billable Google calls. Tune against real spend.
 *  Override with PLACES_DAILY_CAP. */
const DAILY_CAP = Number(process.env.PLACES_DAILY_CAP ?? 20_000);

/** How long to trust a DB-total read before re-querying (ms). */
const DB_TOTAL_TTL_MS = 30_000;

let day = utcDay();
const counts: Record<PlacesSku, number> = {
  autocomplete: 0,
  text_search: 0,
  nearby_search: 0,
  details_list: 0,
  details_full: 0,
  photo: 0,
};

let dbTotalCache: { day: string; total: number; at: number } | null = null;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollIfNewDay() {
  const today = utcDay();
  if (today !== day) {
    day = today;
    SKUS.forEach((k) => (counts[k] = 0));
    dbTotalCache = null;
  }
}

/** Total billable calls this instance has seen today (fast floor). */
export function instanceCallsToday(): number {
  rollIfNewDay();
  return SKUS.reduce((a, k) => a + counts[k], 0);
}

/** Record one billable Google call. Call only on a real (uncached) hit.
 *  In-memory bump is synchronous; the global ledger write is fire-and-forget. */
export function trackCall(sku: PlacesSku, n = 1): void {
  rollIfNewDay();
  counts[sku] += n;
  if (dbTotalCache && dbTotalCache.day === day) dbTotalCache.total += n;
  void recordSpend(day, sku, n).catch(() => {});
}

async function recordSpend(d: string, sku: PlacesSku, n: number): Promise<void> {
  await db
    .insert(placesSpend)
    .values({ id: `${d}:${sku}`, day: d, sku, count: n, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: placesSpend.id,
      set: { count: sql`${placesSpend.count} + ${n}`, updatedAt: new Date() },
    });
}

/** Global total across all instances for today, memoized for DB_TOTAL_TTL_MS. */
async function dbTotalToday(): Promise<number> {
  rollIfNewDay();
  const now = Date.now();
  if (dbTotalCache && dbTotalCache.day === day && now - dbTotalCache.at < DB_TOTAL_TTL_MS) {
    return dbTotalCache.total;
  }
  let total = 0;
  try {
    const rows = await db
      .select({ total: sql<number>`coalesce(sum(${placesSpend.count}), 0)` })
      .from(placesSpend)
      .where(eq(placesSpend.day, day));
    total = Number(rows[0]?.total ?? 0);
  } catch {
    // DB hiccup → fall back to the in-memory floor; never block on telemetry.
    total = instanceCallsToday();
  }
  dbTotalCache = { day, total, at: now };
  return total;
}

/** True when the daily cap is reached — proxy should serve cache-only.
 *  Trips on either the local floor or the global ledger, whichever hits first. */
export async function isOverCap(): Promise<boolean> {
  if (instanceCallsToday() >= DAILY_CAP) return true;
  return (await dbTotalToday()) >= DAILY_CAP;
}

/** Snapshot for an admin/monitoring surface (global, per-SKU, today). */
export async function spendSnapshot() {
  rollIfNewDay();
  const bySku: Record<string, number> = {};
  let total = 0;
  try {
    const rows = await db
      .select({ sku: placesSpend.sku, count: placesSpend.count })
      .from(placesSpend)
      .where(eq(placesSpend.day, day));
    for (const r of rows) {
      bySku[r.sku] = (bySku[r.sku] ?? 0) + r.count;
      total += r.count;
    }
  } catch {
    for (const k of SKUS) bySku[k] = counts[k];
    total = instanceCallsToday();
  }
  return { day, cap: DAILY_CAP, total, bySku, overCap: total >= DAILY_CAP };
}
