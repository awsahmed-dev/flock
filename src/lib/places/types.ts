/**
 * Paxawa v2 — the Place domain contract.
 *
 * Provider-agnostic shape the entire discovery stack consumes: the Google
 * client produces it, the cache stores it, the ranking engine scores it, and
 * the UI renders it. Keeping one canonical type means the engine never
 * touches a Google-shaped payload directly — if we ever blend a second
 * provider, only the adapter changes.
 *
 * See docs/v2-discovery-logic.md §5 (place lifecycle) and
 * docs/v2-discovery-build-spec.md §A4 (the explicit feature axes).
 */

/** Coarse buckets the UI + ranking use; mapped from Google place types. */
export type PlaceCategory =
  | "eat"
  | "coffee"
  | "sight"
  | "nightlife"
  | "shopping"
  | "activity"
  | "stay"
  | "other";

/** Price level, 0 (free) .. 4 ($$$$). Null when Google has no price signal. */
export type PriceLevel = 0 | 1 | 2 | 3 | 4 | null;

/**
 * A real place, normalized. Everything the card, the detail panel, and the
 * scorer need — nothing Google-specific leaks past this boundary.
 */
export interface Place {
  /** Google place_id — the durable key. Cache forever; refetch fields. */
  placeId: string;
  provider: "google";
  name: string;
  /** Coarse category bucket (for chips + slot filling). */
  category: PlaceCategory;
  /** Raw Google place types (e.g. ["ramen_restaurant","restaurant"]). The
   *  ranking engine's tag/cuisine features derive from these. */
  placeTypes: string[];
  rating: number | null;
  /** Total ratings — quality math weighs rating × log(count). */
  userRatingsTotal: number | null;
  priceLevel: PriceLevel;
  /** [lng, lat] — Mapbox order, so the map layer needs no flip. */
  coords: [number, number];
  address: string | null;
  /** Google photo resource name (not a URL). Resolved lazily via the photo
   *  proxy so we never store/serve Google bytes directly. */
  photoRef: string | null;
  /** Up to ~10 photo resource names for the detail carousel. Optional so older
   *  cached snapshots (pre-carousel) still satisfy the type. */
  photoRefs?: string[];
  /** Opening-hours one-liner for the card ("Open · closes 22:00"). */
  hoursSummary: string | null;
  /** Editorial/first review snippet for the card, when present. */
  topTip: string | null;
}

/** Lightweight autocomplete prediction — one network-cheap step before a
 *  full Place (which only the selected prediction fetches details for). */
export interface PlacePrediction {
  placeId: string;
  /** Primary text ("Kheng Hoe Hainanese Chicken Rice"). */
  primary: string;
  /** Secondary text ("Lebuh Chulia, George Town"). */
  secondary: string;
  placeTypes: string[];
}

/**
 * Feature vector of a place — the sparse, normalized representation the taste
 * engine scores against. Built from category + placeTypes + the two explicit
 * scalar axes (build-spec §A4). The engine never re-derives this from raw
 * Google data; the adapter computes it once when the Place is normalized.
 */
export interface PlaceFeatures {
  /** Weighted tags over category/cuisine/atmosphere (sparse). */
  tags: Record<string, number>;
  /** 0 (niche/low-review) .. 1 (famous/high-review) within its category-area. */
  popularityPercentile: number | null;
  /** 0 ($) .. 1 ($$$$) normalized price. */
  priceNorm: number | null;
}

/** Which field-mask SKU profile a request uses — the cost lever (planning §5.2). */
export type FieldMaskProfile = "list" | "detail";
