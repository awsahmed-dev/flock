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
import { photoFor } from "@/lib/packages/photos";
import { segmentsFromLegs, projectDays } from "@/lib/packages/project";
import { CANONICAL_PACKAGES } from "@/lib/packages/canonical";

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

  it("has a photograph for most landmarks", () => {
    // Three testers stopped at the same wall: a plan for a country they had
    // never seen, with no pictures anywhere. Wikidata covers landmarks well
    // and small kitchens poorly, which is the honest split — this floor
    // just stops the set being silently emptied.
    const named = all.flatMap((b) => [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]).flatMap((d) => d.places);
    const shown = named.filter((p) => photoFor(p.name)).length;
    expect(shown / named.length, `${shown}/${named.length} places have a photo`).toBeGreaterThanOrEqual(0.4);
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

  it("covers the OTHER corpus too", () => {
    // The guard was written against the corpus the route picker reads, and
    // passed — while a second, still-reachable package corpus went on
    // shipping the same day titled «بلاد النبيذ», wine country, with no
    // winery in it. A rule that only covers the file you were looking at
    // is not a rule. Every user-facing string, wherever it lives.
    const hits: string[] = [];
    for (const pkg of CANONICAL_PACKAGES) {
      for (const [field, v] of [
        ["title", pkg.title], ["titleAr", pkg.titleAr],
        ["provenance", pkg.provenance], ["provenanceAr", pkg.provenanceAr],
      ] as const) {
        if (v && BOOZE.test(String(v).replace(NOT_A_BAR, ""))) hits.push(`${pkg.title} ${field}: ${v}`);
      }
      for (const d of pkg.days ?? []) {
        for (const [field, v] of [["title", d.title], ["titleAr", d.titleAr]] as const) {
          if (v && BOOZE.test(String(v).replace(NOT_A_BAR, ""))) hits.push(`${pkg.title}/${d.title} ${field}: ${v}`);
        }
        for (const pl of d.places ?? []) {
          for (const [field, v] of [["name", pl.name], ["nameAr", pl.nameAr], ["why", pl.why], ["whyAr", pl.whyAr]] as const) {
            if (v && BOOZE.test(String(v).replace(NOT_A_BAR, ""))) hits.push(`${pkg.title}/${pl.name} ${field}: ${v}`);
          }
        }
      }
    }
    expect(hits, `alcohol in the package corpus:\n${hits.join("\n")}`).toEqual([]);
  });
});

describe("meals", () => {
  /**
   * The founder opened the app and said "it only brings attraction places,
   * I don't see any restaurants". He was right, twice over: plans built
   * before meals were typed rendered restaurants with a temple's icon, and
   * underneath that the corpus barely has any — 42% of curated days have
   * no meal on them at all, and seven bases have none anywhere.
   *
   * This test does not demand a meal on every day. It pins the current
   * state so the gap is visible in CI instead of in someone's holiday, and
   * it tightens as the authoring pass lands. Lower the numbers, never
   * raise them.
   */
  const MIN_DAYS_WITH_A_MEAL = 0.9;

  it("puts a meal on nearly every day, and at least one in every city", () => {
    let total = 0;
    let withFood = 0;
    const none: string[] = [];
    for (const b of all) {
      if (!b.maxNights) continue;
      let any = 0;
      for (const d of b.days) {
        total++;
        if (d.places.some((p) => p.category === "food")) {
          withFood++;
          any++;
        }
      }
      if (any === 0) none.push(b.id);
    }
    expect(none, `bases with no meal anywhere: ${none.join(", ")}`).toEqual([]);
    expect(withFood / total, `${withFood}/${total} curated days carry a meal`).toBeGreaterThanOrEqual(
      MIN_DAYS_WITH_A_MEAL,
    );
  });

  /**
   * Silence is the one answer that isn't allowed. A tester who needs halal
   * food searched the whole app and found nothing — not a tag, not a
   * filter, not a note — and said she'd rather be told we don't know than
   * be handed four drinking alleys and have it called dinner.
   */
  it("says something about eating at every single food place", () => {
    const silent: string[] = [];
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const p of d.places) {
          if (p.category === "food" && !p.dietary?.length) silent.push(`${b.id}/${p.name}`);
        }
      }
    }
    expect(silent, `food with no dietary answer:\n${silent.join("\n")}`).toEqual([]);
  });

  it("never claims halal and pork on the same plate", () => {
    const contradictory: string[] = [];
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const p of d.places) {
          const t = p.dietary ?? [];
          if (t.includes("halal") && t.includes("pork-served")) contradictory.push(`${b.id}/${p.name}`);
        }
      }
    }
    expect(contradictory, `both halal and pork-served:\n${contradictory.join("\n")}`).toEqual([]);
  });
});

describe("opening days", () => {
  /**
   * A tester was scheduled into Feira da Ladra on a Thursday while the
   * card's own tip read "Tuesdays and Saturdays only" — two lines of the
   * app's own text contradicting each other on one card. The constraint
   * lived in prose; nothing could read it.
   */
  it("never schedules a place on a day it is shut", () => {
    const bad: string[] = [];
    for (const route of ROUTES) {
      // Walk a year of start dates so every weekday alignment is covered.
      for (let offset = 0; offset < 7; offset++) {
        const start = new Date(Date.UTC(2026, 3, 5 + offset)).toISOString().slice(0, 10);
        const alloc = allocateNights(route, BASES, Math.min(10, routeCapacity(route, BASES)));
        const days = projectDays(segmentsFromLegs(alloc.legs, start), BASES, start);
        for (const d of days) {
          const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
          for (const p of d.places) {
            if (p.openDays && !p.openDays.includes(weekday)) {
              bad.push(`${route.id} @ ${start}: ${p.name} on ${d.date} (weekday ${weekday})`);
            }
          }
        }
      }
    }
    expect(bad, `scheduled while closed:\n${bad.slice(0, 10).join("\n")}`).toEqual([]);
  });

  it("keeps the constraint and the prose in agreement", () => {
    // If the copy names specific days, the data must say so too — that
    // mismatch is what shipped.
    const SAYS_DAYS = /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b[^.]*\bonly\b|\bonly\b[^.]*\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/i;
    const untagged: string[] = [];
    for (const b of all) {
      for (const d of [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]) {
        for (const p of d.places) {
          if (SAYS_DAYS.test(p.why) && !p.openDays) untagged.push(`${b.id}/${p.name}: ${p.why}`);
        }
      }
    }
    expect(untagged, `copy names opening days but openDays is unset:\n${untagged.join("\n")}`).toEqual([]);
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
