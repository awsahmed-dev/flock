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
