/**
 * Phase 6 §5 — the Taste Engine core. Five dimensions, 0–100. These are
 * the ONLY dimensions; category is a filter, not taste.
 *
 *   BUDGET     0 street/free    → 100 Michelin/luxury
 *   DISCOVERY  0 iconic         → 100 hidden gem
 *   ENERGY     0 chill          → 100 pack-it-all-in
 *   VIBE       0 photogenic     → 100 authentic/local
 *   DEPTH      0 quick hit      → 100 cultural immersion
 */

export const TASTE_DIMENSIONS = ["budget", "discovery", "energy", "vibe", "depth"] as const;
export type TasteDimension = (typeof TASTE_DIMENSIONS)[number];
export type FiveDimVector = Record<TasteDimension, number>;

export const NEUTRAL_VECTOR: FiveDimVector = { budget: 50, discovery: 50, energy: 50, vibe: 50, depth: 50 };

/** §5-D signal weights — the exact table from the brief. */
export const SIGNAL_WEIGHTS = {
  visited_rated_positive: 10,
  add_to_plan: 5,
  heart: 3,
  bookmark: 2,
  dwell_4s: 1,
  skip: -1,
  not_interested: -5,
} as const;
export type TasteSignal = keyof typeof SIGNAL_WEIGHTS;

/** Running-average nudge toward (or away from) the place's dimension values.
 *  new = (current × momentum + place × weight) / (momentum + weight);
 *  negative weights push away from the place instead. Momentum soft-caps
 *  at 20 so a formed taste still moves, slowly. */
export function nudgeVector(
  current: FiveDimVector,
  place: FiveDimVector,
  signal: TasteSignal,
  interactionCount: number,
): FiveDimVector {
  const weight = SIGNAL_WEIGHTS[signal];
  const momentum = Math.min(20, Math.max(1, interactionCount));
  const w = Math.abs(weight);
  const next = { ...current };
  for (const d of TASTE_DIMENSIONS) {
    const target = weight >= 0 ? place[d] : clamp(current[d] + (current[d] - place[d]) * 0.5);
    next[d] = clamp((current[d] * momentum + target * w) / (momentum + w));
  }
  return next;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 100) / 100));
}

/** Cosine similarity over the 5 dims, centered at 50 so "everything
 *  neutral" doesn't fake agreement. Returns 0..1. */
export function cosineSimilarity(a: FiveDimVector, b: FiveDimVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const d of TASTE_DIMENSIONS) {
    const av = a[d] - 50;
    const bv = b[d] - 50;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0.5;
  return (dot / (Math.sqrt(na) * Math.sqrt(nb)) + 1) / 2;
}

/** §5-E: Least Misery + average — penalize what anyone would hate. */
export function crewScore(place: FiveDimVector, members: FiveDimVector[]): number {
  if (members.length === 0) return 0.5;
  const scores = members.map((m) => cosineSimilarity(place, m));
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  return average * 0.7 + minScore * 0.3;
}

/** §5-E champion: one member would LOVE it (similarity > 0.85). */
export function championFor(
  place: FiveDimVector,
  members: { userId: string; name: string; vector: FiveDimVector }[],
): { userId: string; name: string } | null {
  let best: { userId: string; name: string; score: number } | null = null;
  for (const m of members) {
    const s = cosineSimilarity(place, m.vector);
    if (s > 0.85 && (!best || s > best.score)) best = { userId: m.userId, name: m.name, score: s };
  }
  return best ? { userId: best.userId, name: best.name } : null;
}

/** §5-G reason chip — never blank. */
export function reasonChip(args: {
  placeTags: FiveDimVector | null;
  userVector: FiveDimVector | null;
  championName: string | null;
  crewHeartsOnSimilar: number;
  isExploration: boolean;
}): string {
  const { placeTags, userVector, championName, crewHeartsOnSimilar, isExploration } = args;
  if (isExploration) return "Wild card — trust us?";
  if (placeTags && userVector && placeTags.discovery > 70 && userVector.discovery > 60)
    return "Hidden gem — your thing";
  if (championName) return `${championName}'s kind of place`;
  if (crewHeartsOnSimilar >= 3) return `${crewHeartsOnSimilar} crew hearts on similar spots`;
  return "Popular with travelers like you";
}

/** §5-F cold-start tiles → initial dimension seeds. */
export const ONBOARDING_TILES: { key: string; label: string; seeds: Partial<FiveDimVector> }[] = [
  { key: "photo", label: "📸 Photo-worthy spots", seeds: { vibe: 20 } },
  { key: "markets", label: "🫙 Local markets", seeds: { discovery: 80, vibe: 70 } },
  { key: "nightlife", label: "🌙 Night life", seeds: { energy: 80, budget: 60 } },
  { key: "art", label: "🏛️ Art & history", seeds: { depth: 80, vibe: 30 } },
  { key: "streetfood", label: "🍜 Street food", seeds: { budget: 15, discovery: 60, vibe: 75 } },
  { key: "nature", label: "🌿 Nature escapes", seeds: { energy: 60, discovery: 70 } },
  { key: "slow", label: "💆 Slow mornings", seeds: { energy: 10, budget: 30 } },
  { key: "packed", label: "⚡ Pack it all in", seeds: { energy: 90, discovery: 50 } },
];

export function seedsFromTiles(keys: string[]): FiveDimVector {
  const acc: Record<TasteDimension, number[]> = { budget: [], discovery: [], energy: [], vibe: [], depth: [] };
  for (const key of keys) {
    const tile = ONBOARDING_TILES.find((t) => t.key === key);
    if (!tile) continue;
    for (const [d, v] of Object.entries(tile.seeds)) acc[d as TasteDimension].push(v as number);
  }
  const out = { ...NEUTRAL_VECTOR };
  for (const d of TASTE_DIMENSIONS) {
    if (acc[d].length) out[d] = clamp(acc[d].reduce((a, b) => a + b, 0) / acc[d].length);
  }
  return out;
}
