import { describe, it, expect } from "vitest";
import type { Place } from "@/lib/places/types";
import { extractFeatures } from "@/lib/places/features";
import { emptyVector, applySessionSignal, applyDurableSignal } from "../taste";
import { rankCandidates, quality } from "../score";
import { diversify, exploreRerank } from "../rerank";
import { eventToSignal } from "../ingest";

function place(over: Partial<Place> = {}): Place {
  return {
    placeId: Math.random().toString(36).slice(2),
    provider: "google",
    name: "Place",
    category: "eat",
    placeTypes: ["restaurant"],
    rating: 4.4,
    userRatingsTotal: 500,
    priceLevel: 2,
    coords: [0, 0],
    address: null,
    photoRef: null,
    hoursSummary: null,
    topTip: null,
    ...over,
  };
}

describe("taste — in-session learning", () => {
  it("dwell → open → add sharpens toward the place's tags", () => {
    const ramen = place({ category: "eat", placeTypes: ["ramen_restaurant", "restaurant"] });
    const f = extractFeatures(ramen);
    let v = emptyVector();
    v = applySessionSignal(v, f, "dwell_5s");
    v = applySessionSignal(v, f, "card_open");
    v = applySessionSignal(v, f, "place_add");
    expect(v.tags["cat:eat"]).toBeGreaterThan(0);
    expect(v.tags["type:ramen_restaurant"]).toBeGreaterThan(0);
  });

  it("positives move the needle far more than noisy negatives", () => {
    const f = extractFeatures(place());
    const added = applySessionSignal(emptyVector(), f, "place_add");
    const scrolled = applySessionSignal(emptyVector(), f, "scroll_past");
    expect(Math.abs(added.tags["cat:eat"])).toBeGreaterThan(
      Math.abs(scrolled.tags["cat:eat"]) * 10,
    );
  });

  it("durable vector only moves on confirmed signals", () => {
    const f = extractFeatures(place());
    const dwell = applyDurableSignal(emptyVector(), f, "dwell_5s"); // not confirmed
    expect(Object.keys(dwell.tags).length).toBe(0);
    const added = applyDurableSignal(emptyVector(), f, "place_add"); // confirmed
    expect(added.tags["cat:eat"]).toBeGreaterThan(0);
  });

  it("popularity axis learns niche vs famous discovery style", () => {
    const niche = { ...extractFeatures(place()), popularityPercentile: 0.05 };
    const famous = { ...extractFeatures(place()), popularityPercentile: 0.95 };
    expect(applySessionSignal(emptyVector(), niche, "place_add").popularityPref).toBeLessThan(0);
    expect(applySessionSignal(emptyVector(), famous, "place_add").popularityPref).toBeGreaterThan(0);
  });
});

describe("score — ranking pipeline", () => {
  it("a well-reviewed 4.6 beats a thinly-reviewed 4.9 (quality)", () => {
    expect(quality(place({ rating: 4.6, userRatingsTotal: 2000 }))).toBeGreaterThan(
      quality(place({ rating: 4.9, userRatingsTotal: 8 })),
    );
  });

  it("tags ai_pick on the top result and hidden_gem on the great-but-quiet one", () => {
    const candidates = [
      place({ placeId: "a", rating: 4.7, userRatingsTotal: 5000, category: "eat" }),
      place({ placeId: "b", rating: 4.6, userRatingsTotal: 30, category: "coffee" }),
      place({ placeId: "c", rating: 3.9, userRatingsTotal: 1000, category: "sight" }),
    ];
    const ranked = rankCandidates(candidates, { vector: emptyVector(), aiPickCount: 1 });
    expect(ranked[0].tags).toContain("ai_pick");
    const gem = ranked.find((r) => r.place.placeId === "b");
    expect(gem?.tags).toContain("hidden_gem");
  });
});

describe("rerank — diversity + exploration", () => {
  it("diversify avoids a top-of-feed that's all one category", () => {
    const candidates = [
      place({ placeId: "e1", category: "eat", rating: 4.6, userRatingsTotal: 2000 }),
      place({ placeId: "e2", category: "eat", rating: 4.6, userRatingsTotal: 2000 }),
      place({ placeId: "c1", category: "coffee", rating: 4.6, userRatingsTotal: 2000 }),
    ];
    const ranked = rankCandidates(candidates, { vector: emptyVector() });
    const top2 = diversify(ranked, 2).map((s) => s.place.category);
    expect(new Set(top2).size).toBe(2); // not both "eat"
  });

  it("exploit-only re-rank returns pure score order; exploring diverges", () => {
    const candidates = [
      place({ placeId: "x", rating: 4.8, userRatingsTotal: 5000 }),
      place({ placeId: "y", rating: 4.2, userRatingsTotal: 1000 }),
      place({ placeId: "z", rating: 3.8, userRatingsTotal: 200 }),
    ];
    const ranked = rankCandidates(candidates, { vector: emptyVector() });
    const exploit = exploreRerank(ranked, { rng: () => 0.99 }); // always >= ratio → exploit
    expect(exploit.map((s) => s.score)).toEqual([...ranked].sort((a, b) => b.score - a.score).map((s) => s.score));

    const explore = exploreRerank(ranked, { rng: () => 0 }); // always < ratio → explore first
    const topScore = Math.max(...ranked.map((s) => s.score));
    expect(explore[0].score).not.toBe(topScore);
  });
});

describe("ingest — event → signal mapping", () => {
  it("maps dwell thresholds, quick-back, votes, and ignores noise", () => {
    expect(eventToSignal({ type: "card_dwell", payload: { dwellMs: 6000 } })).toBe("dwell_5s");
    expect(eventToSignal({ type: "card_dwell", payload: { dwellMs: 3000 } })).toBe("dwell_2s");
    expect(eventToSignal({ type: "card_dwell", payload: { dwellMs: 500 } })).toBe("scroll_past");
    expect(eventToSignal({ type: "card_dwell", payload: { dwellMs: 1500 } })).toBeNull();
    expect(eventToSignal({ type: "detail_dwell", payload: { dwellMs: 800 } })).toBe("open_then_back");
    expect(eventToSignal({ type: "decision_vote", payload: { vote: "no" } })).toBe("decision_vote_no");
    expect(eventToSignal({ type: "impression" })).toBeNull();
  });
});
