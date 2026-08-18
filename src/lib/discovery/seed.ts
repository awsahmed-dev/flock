import "server-only";

/**
 * Paxawa v2 — the cold-start seed feed (build-spec §A6, logic §2.5).
 *
 * "Land in Discover on a diverse, high-quality seed — top-rated across
 * Eat/See/Do, famous + a few gems. Even with zero signal the first screen is
 * genuinely good." This is what makes the feed open *full* instead of empty,
 * and what makes the engine feel smart on day one.
 *
 * Why text search, not nearby: a Nearby call needs a precise center, so a
 * country-level destination ("Japan") anchors on whatever point we geocoded —
 * often rural, giving a thin/irrelevant feed (the bug the user hit). Text search
 * ("must-see attractions in Japan") lets Google resolve the destination itself,
 * returning the real famous + gem set regardless of how coarse the center is.
 *
 * Shared + cached per (destination, category, locale): everyone planning the
 * same place hits the same seed, so the whole thing usually costs zero Google
 * calls. The result is a raw candidate set — the client re-ranks it live against
 * the session taste vector (rank-feed.ts).
 */

import type { Place, PlaceCategory } from "@/lib/places/types";
import { textSearch, nearby } from "@/lib/places/google";
import { warmCache } from "@/lib/places/cache";

/** Search phrasing per category — tuned to return famous anchors + a few gems. */
const CATEGORY_PROMPT: Record<string, string> = {
  eat: "best restaurants",
  coffee: "best coffee shops and cafes",
  sight: "must-see attractions and landmarks",
  nightlife: "best bars and nightlife",
  shopping: "best shopping",
  activity: "best things to do",
  // P6: stays discovery on the Bookings page reuses the cached seed pipeline.
  stay: "best hotels and places to stay",
};

/** The diverse Eat/See/Do mix for the "All" seed, capped per category so
 *  nothing dominates (A6). Order = interleave priority. */
const SEED_MIX: string[] = ["sight", "eat", "activity", "coffee"];
const PER_CATEGORY = 8;
const SEED_TTL_MS = 6 * 60 * 60 * 1000; // 6h — the seed is stable per destination

interface SeedOpts {
  destination: string;
  center?: [number, number] | null;
  /** LIVE "near me": center is the device's location — restrict to a walkable
   *  radius instead of resolving the whole destination. */
  near?: boolean;
  category?: string | null;
  languageCode?: "en" | "ar";
  /** Over cap: serve only an already-cached seed, never call Google. */
  cacheOnly?: boolean;
}

const seedCache = new Map<string, { places: Place[]; at: number }>();

function cacheKey(o: SeedOpts): string {
  const near = o.near && o.center ? `|near:${o.center[1].toFixed(2)},${o.center[0].toFixed(2)}` : "";
  return `${o.destination}|${o.category ?? "all"}|${o.languageCode ?? "en"}${near}`;
}

const NEAR_RADIUS_M = 3_000;
const NEAR_TYPES: Record<string, string[]> = {
  eat: ["restaurant"],
  coffee: ["cafe", "coffee_shop"],
  sight: ["tourist_attraction", "museum", "park"],
  nightlife: ["bar", "night_club"],
  shopping: ["shopping_mall", "store"],
  activity: ["amusement_park", "spa", "zoo"],
};

/**
 * Build (or serve cached) the seed feed for a destination. With a category →
 * that category's best; without → a diverse Eat/See/Do blend.
 */
export async function buildSeedFeed(opts: SeedOpts): Promise<Place[]> {
  const key = cacheKey(opts);
  const hit = seedCache.get(key);
  if (hit && Date.now() - hit.at < SEED_TTL_MS) return hit.places;
  if (opts.cacheOnly) return hit?.places ?? [];

  let places: Place[];
  if (opts.category && opts.category in CATEGORY_PROMPT) {
    places = dedupe(await categoryFeed(opts.category, opts));
  } else {
    const lists = await Promise.all(
      SEED_MIX.map((c) => categoryFeed(c, opts).catch(() => [] as Place[])),
    );
    places = interleave(lists, PER_CATEGORY);
  }

  seedCache.set(key, { places, at: Date.now() });
  void warmCache(places); // make later detail opens free
  return places;
}

/** One category's candidate set: text search (resolves the destination), plus a
 *  nearby refinement when we have a real center to localize around. */
async function categoryFeed(category: string, opts: SeedOpts): Promise<Place[]> {
  if (opts.near && opts.center) {
    // Around the person, not around the country: a hard 3km circle.
    const list = await nearby({
      lat: opts.center[1],
      lng: opts.center[0],
      radius: NEAR_RADIUS_M,
      includedTypes: NEAR_TYPES[category] ?? NEAR_TYPES.sight,
      languageCode: opts.languageCode,
      max: 15,
    });
    return list.map((p) => withCategory(p, category));
  }
  const prompt = `${CATEGORY_PROMPT[category] ?? "top places"} in ${opts.destination}`;
  const text = await textSearch(prompt, {
    lat: opts.center?.[1],
    lng: opts.center?.[0],
    languageCode: opts.languageCode,
    max: 15,
  });
  return text.map((p) => withCategory(p, category));
}

/** Tag the place's coarse category from the seed bucket when Google's types are
 *  ambiguous, so the diverse blend keeps its Eat/See/Do balance. */
function withCategory(p: Place, seedCategory: string): Place {
  if (p.category !== "other") return p;
  const known: PlaceCategory[] = ["eat", "coffee", "sight", "nightlife", "shopping", "activity"];
  return known.includes(seedCategory as PlaceCategory)
    ? { ...p, category: seedCategory as PlaceCategory }
    : p;
}

/** Round-robin interleave the per-category lists (capped each), deduped — so the
 *  blended feed alternates Eat/See/Do rather than clustering. */
function interleave(lists: Place[][], cap: number): Place[] {
  const capped = lists.map((l) => l.slice(0, cap));
  const out: Place[] = [];
  const max = Math.max(0, ...capped.map((l) => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of capped) if (list[i]) out.push(list[i]);
  }
  return dedupe(out);
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of places) {
    if (seen.has(p.placeId)) continue;
    seen.add(p.placeId);
    out.push(p);
  }
  return out;
}

/** Test/ops seam — drop the in-memory seed cache. */
export function _clearSeedCache(): void {
  seedCache.clear();
}
