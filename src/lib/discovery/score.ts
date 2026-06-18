/**
 * Paxawa v2 — the ranking pipeline (logic §3.2, build-spec §A4/§A5).
 *
 * Takes already-fetched real Places and ranks them: filter → score → tag.
 * The engine never calls Google — it scores what the proxy already returned.
 * Pure + deterministic.
 */

import type { Place, PlaceFeatures } from "@/lib/places/types";
import { extractFeatures } from "@/lib/places/features";
import { type TasteVector, tagCosine } from "./taste";

/** Search = explicit intent (lean quality+taste). Browse = exploration (lean proximity). */
export type RankMode = "search" | "browse";

interface ModeWeights {
  quality: number;
  taste: number;
  proximity: number;
  crew: number;
}
export const MODE_WEIGHTS: Record<RankMode, ModeWeights> = {
  search: { quality: 0.35, taste: 0.4, proximity: 0.1, crew: 0.15 },
  browse: { quality: 0.3, taste: 0.3, proximity: 0.3, crew: 0.1 },
};

/** Penalties subtracted from score. */
export const PENALTY = { alreadyAdded: 1.0, rejected: 2.0 };

/** Quality = normalized rating × saturated review count. A 4.6×2000 beats 4.9×8. */
export function quality(p: Place): number {
  if (p.rating == null) return 0;
  const ratingNorm = p.rating / 5;
  const count = p.userRatingsTotal ?? 0;
  // log10 saturates at ~10k reviews (log10(10000)=4) → cap at 1.
  const reviewNorm = Math.min(1, Math.log10(count + 1) / 4);
  return ratingNorm * reviewNorm;
}

/** Taste fit: cosine over tags (mapped 0..1) + how well the place's
 *  popularity/price match the learned scalar prefs. */
export function tasteFit(features: PlaceFeatures, vector: TasteVector): number {
  const cos = tagCosine(features, vector); // -1..1
  const tagScore = (cos + 1) / 2; // → 0..1

  let scalarScore = 0;
  let scalarTerms = 0;
  if (features.popularityPercentile != null) {
    const signed = 2 * features.popularityPercentile - 1; // -1..1
    scalarScore += 1 - Math.abs(signed - vector.popularityPref) / 2;
    scalarTerms++;
  }
  if (features.priceNorm != null) {
    const signed = 2 * features.priceNorm - 1;
    scalarScore += 1 - Math.abs(signed - vector.pricePref) / 2;
    scalarTerms++;
  }
  const scalarAvg = scalarTerms ? scalarScore / scalarTerms : 0.5;

  // Tags dominate; scalar axes refine.
  return 0.7 * tagScore + 0.3 * scalarAvg;
}

/** Haversine distance in km between two [lng, lat] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Proximity decays with distance. No ref point → neutral 1. */
export function proximity(p: Place, ref: [number, number] | null, scaleKm = 3): number {
  if (!ref) return 1;
  const km = distanceKm(p.coords, ref);
  return 1 / (1 + km / scaleKm);
}

export type PlaceTag = "ai_pick" | "hidden_gem" | "crew_favorite" | `for_${string}`;

export interface ScoredPlace {
  place: Place;
  features: PlaceFeatures;
  score: number;
  /** percentile of review count within this candidate set (0 niche .. 1 famous). */
  popularityPercentile: number;
  tags: PlaceTag[];
}

export interface RankOptions {
  vector: TasteVector;
  mode?: RankMode;
  ref?: [number, number] | null;
  crewFavorites?: ReadonlySet<string>;
  alreadyAdded?: ReadonlySet<string>;
  rejected?: ReadonlySet<string>;
  /** how many top-scored get the ✨ ai_pick tag */
  aiPickCount?: number;
}

/**
 * Rank a candidate set end to end. Computes each place's review-count
 * percentile *relative to this set* (popularity is relative, per the contract),
 * folds it into the features, scores, sorts, and tags.
 */
export function rankCandidates(places: Place[], opts: RankOptions): ScoredPlace[] {
  const {
    vector,
    mode = "search",
    ref = null,
    crewFavorites,
    alreadyAdded,
    rejected,
    aiPickCount = 3,
  } = opts;
  const w = MODE_WEIGHTS[mode];

  // 1. Review-count percentile within the set (the niche↔famous axis).
  const counts = places.map((p) => p.userRatingsTotal ?? 0);
  const sorted = [...counts].sort((a, b) => a - b);
  const percentileOf = (c: number): number => {
    if (sorted.length <= 1) return 0.5;
    // fraction of the set with fewer reviews than this place.
    let below = 0;
    for (const v of sorted) if (v < c) below++;
    return below / (sorted.length - 1);
  };

  // median review count for the hidden_gem test.
  const median = sorted.length
    ? sorted[Math.floor(sorted.length / 2)]
    : 0;

  // 2. Score.
  const scored: ScoredPlace[] = places.map((p) => {
    const pct = percentileOf(p.userRatingsTotal ?? 0);
    const features = { ...extractFeatures(p), popularityPercentile: pct };
    let score =
      w.quality * quality(p) +
      w.taste * tasteFit(features, vector) +
      w.proximity * proximity(p, ref) +
      w.crew * (crewFavorites?.has(p.placeId) ? 1 : 0);
    if (alreadyAdded?.has(p.placeId)) score -= PENALTY.alreadyAdded;
    if (rejected?.has(p.placeId)) score -= PENALTY.rejected;
    return { place: p, features, score, popularityPercentile: pct, tags: [] };
  });

  // 3. Sort high→low.
  scored.sort((a, b) => b.score - a.score);

  // 4. Tag.
  scored.forEach((s, i) => {
    const tags: PlaceTag[] = [];
    if (i < aiPickCount && s.score > 0) tags.push("ai_pick");
    if (
      s.place.rating != null &&
      s.place.rating >= 4.5 &&
      (s.place.userRatingsTotal ?? 0) < median
    )
      tags.push("hidden_gem");
    if (crewFavorites?.has(s.place.placeId)) tags.push("crew_favorite");
    s.tags = tags;
  });

  return scored;
}
