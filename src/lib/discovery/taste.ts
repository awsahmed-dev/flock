/**
 * Paxawa v2 — the taste vector + signal-update math.
 *
 * The brain that makes Discovery feel personal. Two timescales (build-spec §2.1):
 *   - session vector (fast, LR_SESSION) → re-ranks the live feed.
 *   - durable vector (slow, LR_DURABLE, confirmed signals only) → survives trips.
 *
 * All pure + deterministic. Numbers are the build-spec's starting points,
 * exported as named constants so they're tunable against real add-rate data.
 * See docs/v2-discovery-build-spec.md §A3–§A4.
 */

import type { PlaceFeatures } from "@/lib/places/types";

/** A learned preference. Sparse tag weights + the two explicit scalar axes. */
export interface TasteVector {
  /** Weighted tags over category/cuisine (sparse). */
  tags: Record<string, number>;
  /** -1 (niche/low-review) .. +1 (famous/high-review). 0 = no preference. */
  popularityPref: number;
  /** -1 ($) .. +1 ($$$$). 0 = no preference. */
  pricePref: number;
}

export const EMPTY_VECTOR: TasteVector = { tags: {}, popularityPref: 0, pricePref: 0 };

export function emptyVector(): TasteVector {
  return { tags: {}, popularityPref: 0, pricePref: 0 };
}

/* ── Learning rates ────────────────────────────────────────────────────── */
export const LR_SESSION = 0.2; // fast: adapts within a handful of signals
export const LR_DURABLE = 0.03; // slow: cross-trip durable preference

/** Per-tag weight is clipped so no single dimension runs away. */
export const TAG_CLIP = 3;

/* ── Signal taxonomy (build-spec §A3) ──────────────────────────────────── */
export type SignalType =
  | "dwell_2s"
  | "dwell_5s"
  | "card_open"
  | "detail_dwell"
  | "place_save"
  | "place_add"
  | "place_suggest"
  | "decision_vote_yes"
  | "decision_vote_no"
  | "expense_at_place"
  | "scroll_past"
  | "open_then_back"
  | "place_remove";

/** Starting signal strengths. Positives trusted > negatives (asymmetry rule). */
export const SIGNAL_STRENGTH: Record<SignalType, number> = {
  dwell_2s: 0.2,
  dwell_5s: 0.5,
  card_open: 0.7,
  detail_dwell: 0.3,
  place_save: 1.0,
  place_add: 1.5,
  place_suggest: 1.2,
  decision_vote_yes: 0.8,
  decision_vote_no: -0.8,
  expense_at_place: 2.0,
  scroll_past: -0.05,
  open_then_back: -0.5,
  place_remove: -1.5,
};

/** Only these update the durable vector (confirmed, deliberate actions). */
export const CONFIRMED_SIGNALS: ReadonlySet<SignalType> = new Set<SignalType>([
  "place_add",
  "place_suggest",
  "decision_vote_yes",
  "decision_vote_no",
  "expense_at_place",
  "place_remove",
]);

export function isConfirmed(type: SignalType): boolean {
  return CONFIRMED_SIGNALS.has(type);
}

/* ── Math ──────────────────────────────────────────────────────────────── */

/** L2 norm of a sparse weight map. */
function l2(weights: Record<string, number>): number {
  let s = 0;
  for (const v of Object.values(weights)) s += v * v;
  return Math.sqrt(s);
}

function clip(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Apply one signal to a vector. Returns a NEW vector (pure). `strength` is the
 * signed signal strength; `lr` the learning rate (session vs durable).
 *
 * Tags move along the place's (unit-normalized) feature direction. The two
 * scalar axes move toward the place's own popularity/price when the signal is
 * positive, away when negative — so engaging niche places teaches "niche."
 */
export function applySignal(
  vector: TasteVector,
  features: PlaceFeatures,
  strength: number,
  lr: number,
): TasteVector {
  const tags = { ...vector.tags };

  // Unit-normalize the feature tags so a place with many types doesn't dominate.
  const norm = l2(features.tags) || 1;
  for (const [tag, w] of Object.entries(features.tags)) {
    const delta = lr * strength * (w / norm);
    tags[tag] = clip((tags[tag] ?? 0) + delta, -TAG_CLIP, TAG_CLIP);
  }

  // Scalar axes: signed target in [-1,1] from the place's own percentile/price.
  let popularityPref = vector.popularityPref;
  if (features.popularityPercentile != null) {
    const target = 2 * features.popularityPercentile - 1; // 0→-1 (niche), 1→+1 (famous)
    popularityPref = clip(popularityPref + lr * strength * target, -1, 1);
  }
  let pricePref = vector.pricePref;
  if (features.priceNorm != null) {
    const target = 2 * features.priceNorm - 1;
    pricePref = clip(pricePref + lr * strength * target, -1, 1);
  }

  return { tags, popularityPref, pricePref };
}

/** Apply a signal to the fast SESSION vector. */
export function applySessionSignal(
  vector: TasteVector,
  features: PlaceFeatures,
  type: SignalType,
): TasteVector {
  return applySignal(vector, features, SIGNAL_STRENGTH[type], LR_SESSION);
}

/**
 * Apply a signal to the slow DURABLE vector — but only for confirmed signals.
 * Non-confirmed signals leave the durable vector unchanged (returned as-is).
 */
export function applyDurableSignal(
  vector: TasteVector,
  features: PlaceFeatures,
  type: SignalType,
): TasteVector {
  if (!isConfirmed(type)) return vector;
  return applySignal(vector, features, SIGNAL_STRENGTH[type], LR_DURABLE);
}

/** Cosine similarity between a place's features and a taste vector's tags. */
export function tagCosine(features: PlaceFeatures, vector: TasteVector): number {
  const a = features.tags;
  const b = vector.tags;
  let dot = 0;
  for (const [tag, w] of Object.entries(a)) dot += w * (b[tag] ?? 0);
  const denom = (l2(a) || 1) * (l2(b) || 1);
  return denom === 0 ? 0 : dot / denom;
}
