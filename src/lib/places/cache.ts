/**
 * Paxawa v2 — Place cache (the cost saver).
 *
 * Two layers in front of Google for single-place lookups (details):
 *   1. in-memory LRU — hot, per-instance, instant.
 *   2. `cached_places` (Postgres) — shared across ALL users/trips. Everyone
 *      planning Penang hits the same restaurants, so this is the single biggest
 *      lever on Google spend (docs/v2-discovery-planning.md §5.3).
 *   3. Google (cold) — only when both miss.
 *
 * Search/autocomplete results are NOT cached here (they're query+location
 * specific and cheap-ish); only resolved `Place` snapshots by placeId are,
 * since those are shared and stable.
 *
 * Freshness: snapshot TTL ~30 days. On a stale hit we serve the cached copy
 * immediately and refresh in the background (stale-while-revalidate), so the
 * user never waits and we stay roughly current + policy-compliant.
 */

import "server-only";
import { db } from "@/lib/db";
import { cachedPlaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Place } from "./types";
import { details as googleDetails } from "./google";
import type { FieldMaskProfile } from "./types";

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LRU_MAX = 1000;

interface Entry {
  place: Place;
  fetchedAt: number;
}

// Simple Map-based LRU: Map preserves insertion order, so re-inserting on read
// moves an entry to the end; we evict from the front when over capacity.
const lru = new Map<string, Entry>();

function lruGet(id: string): Entry | undefined {
  const e = lru.get(id);
  if (!e) return undefined;
  lru.delete(id);
  lru.set(id, e);
  return e;
}

function lruSet(id: string, e: Entry) {
  if (lru.has(id)) lru.delete(id);
  lru.set(id, e);
  while (lru.size > LRU_MAX) {
    const oldest = lru.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    lru.delete(oldest);
  }
}

function isStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > TTL_MS;
}

/** Read-through cached place details. LRU → DB → Google, with SWR refresh. */
export async function getCachedPlace(
  placeId: string,
  opts: { profile?: FieldMaskProfile; languageCode?: string } = {},
): Promise<Place> {
  // 1. LRU
  const hot = lruGet(placeId);
  if (hot && !isStale(hot.fetchedAt)) return hot.place;

  // 2. DB shared cache
  const row = await db.query.cachedPlaces.findFirst({
    where: eq(cachedPlaces.placeId, placeId),
  });
  if (row) {
    const place = row.snapshot as Place;
    const fetchedAt = row.fetchedAt?.getTime?.() ?? 0;
    lruSet(placeId, { place, fetchedAt });
    if (isStale(fetchedAt)) {
      // stale-while-revalidate: return now, refresh in background.
      void refresh(placeId, opts).catch(() => {});
    }
    return place;
  }

  // 3. Cold — fetch + persist
  return refresh(placeId, opts);
}

/** Fetch fresh from Google, write through both cache layers, return it. */
async function refresh(
  placeId: string,
  opts: { profile?: FieldMaskProfile; languageCode?: string },
): Promise<Place> {
  const place = await googleDetails(placeId, opts);
  const fetchedAt = Date.now();
  lruSet(placeId, { place, fetchedAt });
  await db
    .insert(cachedPlaces)
    .values({ placeId, snapshot: place, fetchedAt: new Date(fetchedAt) })
    .onConflictDoUpdate({
      target: cachedPlaces.placeId,
      set: { snapshot: place, fetchedAt: new Date(fetchedAt) },
    })
    .catch(() => {}); // cache write failures must never break the request
  return place;
}

/** Warm the shared cache from a list of already-fetched places (e.g. after a
 *  search) so later detail opens are free. Fire-and-forget. */
export async function warmCache(places: Place[]): Promise<void> {
  const now = new Date();
  for (const p of places) {
    lruSet(p.placeId, { place: p, fetchedAt: now.getTime() });
  }
  await db
    .insert(cachedPlaces)
    .values(places.map((p) => ({ placeId: p.placeId, snapshot: p, fetchedAt: now })))
    .onConflictDoNothing()
    .catch(() => {});
}
