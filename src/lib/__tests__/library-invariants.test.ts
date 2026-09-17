/**
 * Invariants the curated library must hold.
 *
 * The one that matters most is `maxNights <= days.length`. It is what makes
 * a blank curated day *structurally impossible* rather than merely unlikely:
 * the allocator never gives a base more nights than its ceiling, so it can
 * never give it more nights than it has content for. Three earlier versions
 * of this system shipped with trailing blank days; this test is the reason
 * a fourth can't.
 *
 * These run against the real data, so authoring a new base with too few day
 * shapes fails the build rather than quietly producing empty days in
 * someone's plan.
 */
import { describe, it, expect } from "vitest";
import { BASES, ROUTES, findRoutes, getBase } from "@/lib/packages/library";
import { allocateNights, routeCapacity } from "@/lib/packages/allocate";
import { coordsFor } from "@/lib/packages/coords";
import { segmentsFromLegs, projectDays } from "@/lib/packages/project";

const all = Object.values(BASES);

describe("base library", () => {
  it("is not empty", () => {
    expect(all.length).toBeGreaterThan(3);
  });

  it("keys match their own id", () => {
    for (const [key, b] of Object.entries(BASES)) expect(b.id).toBe(key);
  });

  it("never allows more nights than it has curated days — no blank days, ever", () => {
    for (const b of all) {
      if (b.maxNights > 0) {
        expect(
          b.days.length,
          `${b.id}: maxNights ${b.maxNights} but only ${b.days.length} day shapes`,
        ).toBeGreaterThanOrEqual(b.maxNights);
      }
    }
  });

  it("gives a stayable base a sane typical/max pair", () => {
    for (const b of all) {
      if (b.maxNights === 0) continue;
      expect(b.typicalNights).toBeGreaterThanOrEqual(1);
      expect(b.typicalNights).toBeLessThanOrEqual(b.maxNights);
      // Cities saturate. Anything past a week is the linear-scaling bug.
      expect(b.maxNights).toBeLessThanOrEqual(7);
    }
  });

  it("gives a day-trip-only base a dayTrip shape and no stay", () => {
    for (const b of all) {
      if (b.maxNights === 0) {
        expect(b.days, `${b.id} is day-trip-only but has stay days`).toHaveLength(0);
        expect(b.dayTrip, `${b.id} is day-trip-only but has no dayTrip shape`).toBeTruthy();
      }
    }
  });

  it("uses unique day keys within each base", () => {
    for (const b of all) {
      const keys = b.days.map((d) => d.key);
      expect(new Set(keys).size, `${b.id} has duplicate day keys`).toBe(keys.length);
    }
  });

  it("has real coordinates and bilingual names", () => {
    for (const b of all) {
      expect(Math.abs(b.lat), `${b.id} lat`).toBeLessThanOrEqual(90);
      expect(Math.abs(b.lng), `${b.id} lng`).toBeLessThanOrEqual(180);
      expect(b.lat === 0 && b.lng === 0, `${b.id} has null-island coords`).toBe(false);
      expect(b.nameAr.trim().length).toBeGreaterThan(0);
      expect(b.name.trim().length).toBeGreaterThan(0);
    }
  });

  it("writes every place in both languages, with a real reason", () => {
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        expect(d.places.length, `${b.id}/${d.key} has no places`).toBeGreaterThan(0);
        expect(d.titleAr.trim().length).toBeGreaterThan(0);
        for (const p of d.places) {
          expect(p.nameAr.trim().length, `${b.id}/${d.key}/${p.name} nameAr`).toBeGreaterThan(0);
          expect(p.whyAr.trim().length, `${b.id}/${d.key}/${p.name} whyAr`).toBeGreaterThan(4);
          expect(p.why.trim().length).toBeGreaterThan(4);
        }
      }
    }
  });

  it("orders each day's places by start time", () => {
    for (const b of all) {
      for (const d of b.days) {
        const times = d.places.map((p) => p.startTime).filter(Boolean) as string[];
        expect([...times].sort(), `${b.id}/${d.key} is out of order`).toEqual(times);
      }
    }
  });

  it("only points reachable/pairsWith at bases that exist", () => {
    for (const b of all) {
      for (const r of b.reachable) expect(BASES[r], `${b.id} reaches unknown ${r}`).toBeTruthy();
      for (const p of b.pairsWith) expect(BASES[p], `${b.id} pairs with unknown ${p}`).toBeTruthy();
      // you can't suggest staying somewhere that has no stay
      for (const p of b.pairsWith) expect(BASES[p].maxNights, `${p} is not stayable`).toBeGreaterThan(0);
      for (const r of b.reachable) expect(BASES[r].dayTrip, `${r} has no day-trip shape`).toBeTruthy();
    }
  });
});

describe("coordinates", () => {
  /**
   * Curated places used to carry none, and a "helpful" fallback geocoded
   * them from their name against the whole destination country — which put
   * Sensō-ji in Okayama and the Grand Bazaar 700km from Istanbul, and then
   * saved the answer. Nothing guesses any more, so a place without a
   * coordinate simply has no pin. That is honest, but it should be a
   * deliberate choice rather than something a new region does by accident.
   */
  /**
   * Places with no confirmable point. Each was checked and deliberately
   * left unpinned by its curator — a missing pin is honest, a wrong one is
   * what we are preventing. Listed by name rather than counted so that a
   * NEW uncovered place fails immediately instead of hiding under a
   * threshold.
   */
  const UNMAPPABLE = new Set([
    "Ebisu Yokochō",          // covered arcade, unmapped; nearest points are the wrong block
    "Hakuza gold leaf house", // the shop is unmapped; the one mapped "箔座" is 600m away
    "Pliva Watermills",       // strung along ~1km of shallows, no single venue
    "Gobustan mud volcanoes", // fields cover several km² with no mapped entrance
    "AlJadidah Arts District",// mapped only as part of AlUla town
    "Gharameel Nature Reserve", // no mapped gate or boundary
    "Harrat Khaybar",         // a lava field the size of a province, not a point
    "Fazayah Beach",          // unmapped; a 4x4 track off the Mughsail road
    "Jabal Samhan viewpoint", // the mapped reserve point is not the escarpment lookout
  ]);

  it("gives every curated place a coordinate, or a documented reason", () => {
    const missing: string[] = [];
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const p of d.places) {
          if (!coordsFor(p.name) && !UNMAPPABLE.has(p.name)) missing.push(`${b.id}: ${p.name}`);
        }
      }
    }
    expect(missing, `no coordinate and not on the unmappable list:\n${missing.join("\n")}`).toEqual([]);
  });

  it("keeps the unmappable list honest — nothing on it has since been pinned", () => {
    const named = new Set(
      all.flatMap((b) => [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]).flatMap((d) => d.places.map((p) => p.name)),
    );
    for (const n of UNMAPPABLE) {
      expect(named.has(n), `${n} is on the unmappable list but no longer exists`).toBe(true);
      expect(coordsFor(n), `${n} has a coordinate now — take it off the list`).toBeNull();
    }
  });

  it("puts every pin inside its own base's metro area", () => {
    const strays: string[] = [];
    for (const b of all) {
      if (!b.lat && !b.lng) continue;
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const p of d.places) {
          const c = coordsFor(p.name);
          if (!c) continue;
          // ~2.5° ≈ 275km: generous enough for a real day trip out of a
          // base, tight enough to catch a pin in the wrong country.
          const far = Math.abs(c[0] - b.lat) > 2.5 || Math.abs(c[1] - b.lng) > 2.5;
          if (far) strays.push(`${b.id}: ${p.name} → ${c[0]},${c[1]} (base ${b.lat},${b.lng})`);
        }
      }
    }
    expect(strays, `pins far from their base:\n${strays.join("\n")}`).toEqual([]);
  });
});

describe("curating for this audience", () => {
  /**
   * A day in Georgia shipped titled "Wine country" / «بلاد النبيذ» and
   * contained a walled hill town, a wall walk and a monastery — not one
   * winery. For a Gulf Muslim audience that title is a reason not to open
   * the card, and nothing in the day earned it.
   *
   * This is not a filter and not a content ban. It asserts that no
   * user-facing string in the corpus leads with alcohol, which is how
   * every curator here has written anyway — this just stops the next one
   * from doing it by accident in a language the reviewer doesn't read.
   */
  // Arabic needs real word boundaries: JS \b does not apply to Arabic
  // letters, so a bare «بيرة» (beer) matches inside «كبيرة» (big) and
  // «الكبيرة». Lookarounds for an Arabic letter give the boundary instead.
  const AR_LETTER = "\\u0621-\\u064A\\u0671-\\u06D3";
  // A coffee bar, a juice bar and a sushi bar are not what this is about.
  // Strip the harmless compounds before testing rather than dropping "bar",
  // which is the word that actually slipped through: four of one tester's
  // seven dinners were alleys sold to her on "six seats per bar".
  const NOT_A_BAR = /\b(coffee|juice|snack|sushi|salad|oyster|noodle|ramen|tapas|sand)[- ]bars?\b/gi;
  const BOOZE = new RegExp(
    "\\b(wine|winery|wineries|brewery|pub|pubs|bar|bars|cocktail|cocktails|whisky|whiskey|vodka|beer|beers|sake bar)\\b" +
      // `(?:ال)?` because the definite article prefixes the noun: without
      // it «النبيذ» — the very string this test was written for — slips
      // through, since «ل» is itself an Arabic letter and blocks the
      // lookbehind.
      `|(?<![${AR_LETTER}])(?:ال)?(نبيذ|خمر|خمور|بيرة|كحول)(?![${AR_LETTER}])`,
    "i",
  );

  it("never leads a place or a day with alcohol", () => {
    const hits: string[] = [];
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const [field, v] of [["title", d.title], ["titleAr", d.titleAr]] as const) {
          if (BOOZE.test(v.replace(NOT_A_BAR, ""))) hits.push(`${b.id}/${d.key} ${field}: ${v}`);
        }
        for (const p of d.places) {
          for (const [field, v] of [["name", p.name], ["nameAr", p.nameAr], ["why", p.why], ["whyAr", p.whyAr]] as const) {
            if (BOOZE.test(v.replace(NOT_A_BAR, ""))) hits.push(`${b.id}/${d.key}/${p.name} ${field}: ${v}`);
          }
        }
      }
    }
    expect(hits, `alcohol in user-facing copy:\n${hits.join("\n")}`).toEqual([]);
  });

  it("never sells a route on it either", () => {
    const hits: string[] = [];
    for (const r of ROUTES) {
      for (const [field, v] of [
        ["title", r.title], ["titleAr", r.titleAr],
        ["subtitle", r.subtitle], ["subtitleAr", r.subtitleAr],
        ["provenance", r.provenance], ["provenanceAr", r.provenanceAr],
        ["forWho", r.forWho], ["forWhoAr", r.forWhoAr],
      ] as const) {
        if (BOOZE.test(v.replace(NOT_A_BAR, ""))) hits.push(`${r.id} ${field}: ${v}`);
      }
    }
    expect(hits, `alcohol in route copy:\n${hits.join("\n")}`).toEqual([]);
  });
});

describe("routes", () => {
  it("have unique ids and reference known bases", () => {
    const ids = ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ROUTES) {
      expect(r.legs.length).toBeGreaterThan(0);
      for (const l of r.legs) {
        expect(BASES[l.baseId], `${r.id} → unknown base ${l.baseId}`).toBeTruthy();
        expect(BASES[l.baseId].maxNights, `${r.id} stays at non-stayable ${l.baseId}`).toBeGreaterThan(0);
        expect(l.nightsRatio).toBeGreaterThan(0);
      }
    }
  });

  it("carry transport for every consecutive pair", () => {
    for (const r of ROUTES) {
      for (let i = 1; i < r.legs.length; i++) {
        const from = r.legs[i - 1].baseId;
        const to = r.legs[i].baseId;
        const t = r.transport.find((x) => x.from === from && x.to === to);
        expect(t, `${r.id}: no transport ${from} → ${to}`).toBeTruthy();
        expect(t!.minutes).toBeGreaterThan(0);
        expect(t!.minutes).toBeLessThan(24 * 60);
      }
    }
  });

  it("are findable by their own destination words", () => {
    for (const r of ROUTES) {
      expect(r.match.length).toBeGreaterThan(0);
      const found = findRoutes(r.match[0]);
      expect(found.map((x) => x.id), `${r.id} not found by "${r.match[0]}"`).toContain(r.id);
    }
  });

  it("find ALL matching routes for a destination, not just the first", () => {
    const japan = findRoutes("Japan");
    expect(japan.length).toBeGreaterThan(1);
  });

  it("project a blank-free plan at every trip length up to capacity", () => {
    for (const route of ROUTES) {
      const cap = routeCapacity(route, BASES);
      for (let n = 1; n <= cap; n++) {
        const alloc = allocateNights(route, BASES, n);
        expect(alloc.overflow, `${route.id} @ ${n} nights overflows below capacity`).toBe(0);
        const days = projectDays(segmentsFromLegs(alloc.legs, "2026-09-30"), BASES, "2026-09-30");
        const blank = days.filter((d) => !d.departure && d.places.length === 0);
        expect(blank.map((d) => d.titleAr), `${route.id} @ ${n} nights has blank days`).toEqual([]);
      }
    }
  });
});

describe("getBase", () => {
  it("returns null for an unknown id rather than throwing", () => {
    expect(getBase("atlantis")).toBeNull();
  });
});
