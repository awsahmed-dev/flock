/**
 * Paxawa v2 — feed ranking wrapper (client-safe, pure).
 *
 * Composes the engine for the live feed: rankCandidates → diversify →
 * exploreRerank. Supports the build-spec §A5 rule that the *seen head* never
 * reshuffles under the user — only the unseen tail re-ranks as the session
 * vector sharpens.
 */

import type { Place } from "@/lib/places/types";
import type { TasteVector } from "../taste";
import { rankCandidates, type ScoredPlace, type RankMode } from "../score";
import { diversify, exploreRerank } from "../rerank";

export interface RankFeedOptions {
  vector: TasteVector;
  mode?: RankMode;
  ref?: [number, number] | null;
  crewFavorites?: ReadonlySet<string>;
  alreadyAdded?: ReadonlySet<string>;
  /** placeIds already seen — frozen at the top, kept in `priorOrder`. */
  frozenIds?: ReadonlySet<string>;
  /** the placeId order currently on screen (to preserve frozen order). */
  priorOrder?: readonly string[];
  /** injectable rng for deterministic tests. */
  rng?: () => number;
}

export function rankFeed(candidates: Place[], opts: RankFeedOptions): ScoredPlace[] {
  const scored = rankCandidates(candidates, {
    vector: opts.vector,
    mode: opts.mode,
    ref: opts.ref,
    crewFavorites: opts.crewFavorites,
    alreadyAdded: opts.alreadyAdded,
  });

  // No frozen head → re-rank the whole list.
  if (!opts.frozenIds || opts.frozenIds.size === 0) {
    return exploreRerank(diversify(scored), { rng: opts.rng });
  }

  // Split seen head (frozen, in prior order) from unseen tail (re-ranked).
  const frozen: ScoredPlace[] = [];
  const tail: ScoredPlace[] = [];
  for (const s of scored) {
    (opts.frozenIds.has(s.place.placeId) ? frozen : tail).push(s);
  }
  if (opts.priorOrder?.length) {
    const idx = new Map(opts.priorOrder.map((id, i) => [id, i]));
    frozen.sort(
      (a, b) => (idx.get(a.place.placeId) ?? 1e9) - (idx.get(b.place.placeId) ?? 1e9),
    );
  }
  const tailRanked = exploreRerank(diversify(tail), { rng: opts.rng });
  return [...frozen, ...tailRanked];
}
