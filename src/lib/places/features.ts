/**
 * Pure place→feature mapping. Lives apart from google.ts (which is
 * `server-only`) so the ranking/learning engine — and its unit tests — can
 * import it without dragging server-only code in.
 *
 * See docs/v2-discovery-build-spec.md §A4 (the explicit feature axes).
 */

import type { Place, PlaceCategory, PlaceFeatures } from "./types";

/** Map Google's many place types to our coarse buckets (first match wins). */
export function toCategory(types: string[]): PlaceCategory {
  const t = new Set(types);
  if (t.has("lodging") || [...t].some((x) => x.includes("hotel"))) return "stay";
  if (t.has("cafe") || t.has("coffee_shop") || t.has("bakery")) return "coffee";
  if (
    t.has("restaurant") ||
    t.has("meal_takeaway") ||
    t.has("food") ||
    [...t].some((x) => x.endsWith("_restaurant"))
  )
    return "eat";
  if (t.has("bar") || t.has("night_club") || t.has("pub")) return "nightlife";
  if (
    t.has("tourist_attraction") ||
    t.has("museum") ||
    t.has("art_gallery") ||
    t.has("place_of_worship") ||
    t.has("park") ||
    t.has("landmark") ||
    t.has("historical_place")
  )
    return "sight";
  if (t.has("shopping_mall") || t.has("store") || t.has("market")) return "shopping";
  if (
    t.has("amusement_park") ||
    t.has("zoo") ||
    t.has("aquarium") ||
    t.has("spa") ||
    t.has("tourist_agency")
  )
    return "activity";
  return "other";
}

/**
 * Sparse feature vector for a place. `tags` mixes the coarse category with the
 * raw Google types so the engine learns at both granularities ("likes cafés"
 * AND "likes coffee_shop"). `popularityPercentile` is left null here — it's
 * relative to a candidate set, so the ranker fills it. `priceNorm` is absolute.
 */
export function extractFeatures(p: Place): PlaceFeatures {
  const tags: Record<string, number> = { [`cat:${p.category}`]: 1 };
  for (const t of p.placeTypes) tags[`type:${t}`] = 1;
  return {
    tags,
    popularityPercentile: null,
    priceNorm: p.priceLevel != null ? p.priceLevel / 4 : null,
  };
}
