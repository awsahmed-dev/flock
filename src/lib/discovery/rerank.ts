/**
 * Paxawa v2 — diversify + explore re-rank (build-spec §A5).
 *
 * Two anti-monotony passes over a scored candidate list:
 *   - diversify() — MMR: a top list that's a spread of categories, not 10 of one.
 *   - exploreRerank() — the For-You loop: ~75% exploit / ~25% explore, so the
 *     feed never collapses into an echo chamber and keeps learning new axes.
 *
 * Pure; rng is injectable so tests are deterministic.
 */

import type { ScoredPlace } from "./score";

export const EXPLORE_RATIO = 0.25; // ~1 in 4 slots is exploratory
export const MMR_LAMBDA = 0.7; // relevance vs diversity in MMR

/** Similarity for MMR: same coarse category = similar. Cheap + effective. */
function categorySim(a: ScoredPlace, b: ScoredPlace): number {
  return a.place.category === b.place.category ? 1 : 0;
}

/**
 * Maximal Marginal Relevance. Greedily build a list maximizing
 * λ·score − (1−λ)·maxSimToChosen, so each pick is high-scoring AND different
 * from what's already chosen. Avoids a top-of-feed that's all ramen.
 */
export function diversify(
  scored: ScoredPlace[],
  limit = scored.length,
  lambda = MMR_LAMBDA,
): ScoredPlace[] {
  const pool = [...scored];
  const chosen: ScoredPlace[] = [];
  // normalize scores to 0..1 for a fair blend with the 0..1 similarity term.
  const max = Math.max(1e-9, ...pool.map((p) => p.score));
  const min = Math.min(...pool.map((p) => p.score), 0);
  const norm = (s: number) => (s - min) / (max - min || 1);

  while (chosen.length < limit && pool.length) {
    let bestIdx = 0;
    let best = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      const maxSim = chosen.length
        ? Math.max(...chosen.map((c) => categorySim(cand, c)))
        : 0;
      const mmr = lambda * norm(cand.score) - (1 - lambda) * maxSim;
      if (mmr > best) {
        best = mmr;
        bestIdx = i;
      }
    }
    chosen.push(pool.splice(bestIdx, 1)[0]);
  }
  return chosen;
}

/** Softmax sampling over scores with a temperature; returns an index. */
function softmaxPick(
  items: ScoredPlace[],
  temperature: number,
  rng: () => number,
): number {
  const scores = items.map((i) => i.score / Math.max(1e-6, temperature));
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - maxS)); // stable
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  let r = rng() * sum;
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i];
    if (r <= 0) return i;
  }
  return items.length - 1;
}

/**
 * Re-rank the UNSEEN tail of the feed. For each output slot we either exploit
 * (take the current best) or explore (softmax-sample a non-top candidate). The
 * exploit/explore split is exploreRatio. The seen head is never touched by the
 * caller — pass only the tail here.
 *
 * `rng` defaults to Math.random; inject a seeded rng in tests.
 */
export function exploreRerank(
  tail: ScoredPlace[],
  opts: {
    exploreRatio?: number;
    temperature?: number;
    rng?: () => number;
  } = {},
): ScoredPlace[] {
  const exploreRatio = opts.exploreRatio ?? EXPLORE_RATIO;
  const temperature = opts.temperature ?? 0.5;
  const rng = opts.rng ?? Math.random;

  const pool = [...tail].sort((a, b) => b.score - a.score);
  const out: ScoredPlace[] = [];

  while (pool.length) {
    if (pool.length === 1) {
      out.push(pool.pop()!);
      break;
    }
    const explore = rng() < exploreRatio;
    if (explore) {
      // sample from the non-top remainder so exploration is genuinely diverse.
      const remainder = pool.slice(1);
      const idxInRemainder = softmaxPick(remainder, temperature, rng);
      out.push(pool.splice(idxInRemainder + 1, 1)[0]);
    } else {
      out.push(pool.shift()!); // exploit: current best
    }
  }
  return out;
}
