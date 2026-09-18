import { describe, it, expect } from "vitest";
import { gatewayState, orderForGateways, gatewayErrands } from "@/lib/packages/gateways";
import { errandsFor, relink, redate } from "@/lib/packages/project";
import type { Segment } from "@/lib/packages/types";

/**
 * Open-jaw trips: in through one city, home from another.
 *
 * "I'll be entering the country from this place or this city, and then I
 * travel back from this city or a different city."
 */

function seg(baseId: string, order: number, checkIn: string, checkOut: string): Segment {
  return {
    baseId,
    order,
    checkIn,
    checkOut,
    transportInMode: order === 0 ? null : "train",
    transportInMinutes: order === 0 ? null : 120,
    dayTrips: [],
    lockedBy: null,
  };
}

const LISBON_PORTO = [
  seg("lisbon", 0, "2026-10-01", "2026-10-05"),
  seg("porto", 1, "2026-10-05", "2026-10-08"),
];

describe("gateway state", () => {
  it("asks nothing when nothing was chosen", () => {
    // The overwhelming majority of trips are a round trip through the first
    // city. That case must produce a statement, never a question.
    const g = gatewayState(LISBON_PORTO, null, null);
    expect(g.arrive).toBe("lisbon");
    expect(g.depart).toBe("porto");
    expect(g.arriveSet).toBe(false);
    expect(g.departSet).toBe(false);
    expect(g.arriveMismatch).toBe(false);
    expect(g.departMismatch).toBe(false);
  });

  it("knows a single-base trip goes out and back the same way", () => {
    const g = gatewayState([seg("lisbon", 0, "2026-10-01", "2026-10-08")], null, null);
    expect(g.openJaw).toBe(false);
    expect(g.arrive).toBe("lisbon");
    expect(g.depart).toBe("lisbon");
  });

  it("spots an open jaw", () => {
    expect(gatewayState(LISBON_PORTO, null, null).openJaw).toBe(true);
    expect(gatewayState(LISBON_PORTO, "lisbon", "lisbon").openJaw).toBe(false);
  });

  it("reports a stored end that disagrees with the shape", () => {
    // You land in Porto but the plan opens in Lisbon. Neither side gets
    // silently rewritten — the screen says so and offers both repairs.
    const g = gatewayState(LISBON_PORTO, "porto", null);
    expect(g.arriveMismatch).toBe(true);
    expect(g.arriveMissing).toBe(false);
    expect(g.departMismatch).toBe(false);
  });

  it("separates a city the trip does not visit from one in the wrong place", () => {
    // Two different problems with two different fixes. Reporting a city
    // that is not in the plan as a "mismatch" would offer to reorder the
    // shape around a base that does not exist in it.
    const g = gatewayState(LISBON_PORTO, "faro", null);
    expect(g.arriveMissing).toBe(true);
    expect(g.arriveMismatch).toBe(false);
  });

  it("has no ends at all when there is no shape", () => {
    const g = gatewayState([], null, null);
    expect(g.arrive).toBeNull();
    expect(g.depart).toBeNull();
    expect(g.openJaw).toBe(false);
  });
});

describe("ordering a route to match the flights", () => {
  const ids = (r: { items: { baseId: string }[] }) => r.items.map((i) => i.baseId);

  it("leaves a route that already matches alone", () => {
    const r = orderForGateways(LISBON_PORTO, (s) => s.baseId, "lisbon", "porto");
    expect(r.reversed).toBe(false);
    expect(r.honoured).toBe(true);
    expect(ids(r)).toEqual(["lisbon", "porto"]);
  });

  it("walks the route backwards when that is what the tickets say", () => {
    const r = orderForGateways(LISBON_PORTO, (s) => s.baseId, "porto", "lisbon");
    expect(r.reversed).toBe(true);
    expect(r.honoured).toBe(true);
    expect(ids(r)).toEqual(["porto", "lisbon"]);
  });

  it("never rotates a chain to put a middle city first", () => {
    // A curated route is a line, not a loop: its geography only holds in
    // order or in reverse. Starting in the middle is a plan that doubles
    // back and does not say so.
    const three = [
      seg("lisbon", 0, "2026-10-01", "2026-10-03"),
      seg("coimbra", 1, "2026-10-03", "2026-10-05"),
      seg("porto", 2, "2026-10-05", "2026-10-08"),
    ];
    const r = orderForGateways(three, (s) => s.baseId, "coimbra", null);
    expect(r.reversed).toBe(false);
    expect(r.honoured).toBe(false);
    expect(ids(r)).toEqual(["lisbon", "coimbra", "porto"]);
  });

  it("keeps the curated direction when reversing is no better", () => {
    // Land in Lisbon, home from Lisbon, on a two-city route: forward
    // satisfies one end, backward satisfies the other, and a tie must not
    // silently flip a route its author wrote in one direction.
    const r = orderForGateways(LISBON_PORTO, (s) => s.baseId, "lisbon", "lisbon");
    expect(r.reversed).toBe(false);
    expect(ids(r)).toEqual(["lisbon", "porto"]);
  });

  it("ignores an end the route does not contain", () => {
    const r = orderForGateways(LISBON_PORTO, (s) => s.baseId, "faro", null);
    expect(r.reversed).toBe(false);
    expect(r.honoured).toBe(true);
  });

  it("has nothing to do with one base", () => {
    const one = [seg("lisbon", 0, "2026-10-01", "2026-10-08")];
    const r = orderForGateways(one, (s) => s.baseId, "lisbon", "lisbon");
    expect(r.reversed).toBe(false);
    expect(r.honoured).toBe(true);
  });
});

describe("legs after a reorder", () => {
  // Reordering changes what each leg IS, not just where it sits. Reversing
  // A → B → C leaves B still advertising the A→B train while it is now
  // reached from C: a real duration for a journey nobody is taking. The
  // shape action clears every leg on reorder so `relink` re-derives them;
  // this test pins the reason that clearing has to happen.
  const base = (id: string, lat: number, lng: number) => ({
    id, name: id, nameAr: id, country: "PT", lat, lng, photoQuery: id, match: [id],
    typicalNights: 2, maxNights: 4, reachable: [], pairsWith: [], days: [],
  });
  const LIB = { a: base("a", 38.7, -9.1), b: base("b", 40.2, -8.4), c: base("c", 41.1, -8.6) };

  it("keeps a leg only while both its endpoints are unchanged", () => {
    const kept: Segment[] = [
      { ...seg("a", 0, "2026-10-01", "2026-10-03"), transportInMode: null, transportInMinutes: null },
      { ...seg("b", 1, "2026-10-03", "2026-10-05"), transportInMode: "train", transportInMinutes: 90 },
    ];
    // Same order, so the stored leg is still true and must survive.
    const same = relink(redate(kept, "2026-10-01"), LIB);
    expect(same[1].transportInMinutes).toBe(90);
  });

  it("refuses to time a journey between two cities it cannot locate", () => {
    // A city the user typed with no coordinates was parked at 0,0. Two of
    // them coincide, so the estimator returned a brisk "20m" for Samarkand
    // to Tashkent — a confident wrong number, which is the exact thing the
    // no-fabrication rule exists to stop. Unlocated means unmeasurable.
    const nowhere = {
      ...base("custom:tashkent", 0, 0),
      coordsUnknown: true,
    };
    const alsoNowhere = { ...base("custom:samarkand", 0, 0), coordsUnknown: true };
    const pair: Segment[] = [
      { ...seg("custom:samarkand", 0, "2026-10-01", "2026-10-03"), transportInMode: null, transportInMinutes: null },
      { ...seg("custom:tashkent", 1, "2026-10-03", "2026-10-06"), transportInMode: null, transportInMinutes: null },
    ];
    const out = relink(redate(pair, "2026-10-01"), {
      "custom:tashkent": nowhere,
      "custom:samarkand": alsoNowhere,
    });
    expect(out[1].transportInMinutes).toBeNull();
    // This used to assert "train", on the reasoning that the mode is still
    // worth saying because you are moving either way. It isn't the same
    // claim: "you are travelling" is true, "you are taking a train" is a
    // specific fact about a route we just admitted we cannot locate. It
    // put «قطار» between Jeddah and Riyadh — 850km, no railway — next to
    // a real measured leg with nothing to tell the two apart. The
    // no-fabrication rule that already governs the duration governs the
    // mode too; the UI asks instead.
    expect(out[1].transportInMode).toBeNull();
  });

  it("drops a duration already stored against two cities it cannot locate", () => {
    // Nothing in the app lets a person type a duration, so a stored number
    // here was generated by one of the hardcoded fallbacks since removed.
    // Keeping it printed "2h" for Tashkent to Samarkand long after the code
    // that invented it was gone.
    const nowhere = { ...base("custom:tashkent", 0, 0), coordsUnknown: true };
    const alsoNowhere = { ...base("custom:samarkand", 0, 0), coordsUnknown: true };
    const stale: Segment[] = [
      { ...seg("custom:tashkent", 0, "2026-10-01", "2026-10-06"), transportInMode: null, transportInMinutes: null },
      { ...seg("custom:samarkand", 1, "2026-10-06", "2026-10-08"), transportInMode: "train", transportInMinutes: 120 },
    ];
    const out = relink(redate(stale, "2026-10-01"), {
      "custom:tashkent": nowhere,
      "custom:samarkand": alsoNowhere,
    });
    expect(out[1].transportInMinutes).toBeNull();
  });

  it("re-derives a leg once the city before it has changed", () => {
    // Cleared the way editShape clears them, then re-linked.
    const reversed: Segment[] = [
      { ...seg("c", 0, "2026-10-01", "2026-10-03"), transportInMode: null, transportInMinutes: null },
      { ...seg("b", 1, "2026-10-03", "2026-10-05"), transportInMode: null, transportInMinutes: null },
      { ...seg("a", 2, "2026-10-05", "2026-10-07"), transportInMode: null, transportInMinutes: null },
    ];
    const out = relink(redate(reversed, "2026-10-01"), LIB);
    expect(out[0].transportInMinutes).toBeNull();
    // b is now reached from c, a much shorter hop than the old a→b 90.
    expect(out[1].transportInMinutes).toBeGreaterThan(0);
    expect(out[1].transportInMinutes).toBeLessThan(90);
    expect(out[2].transportInMinutes).toBeGreaterThan(0);
  });
});

describe("the flights the shape implies", () => {
  it("is one booking when you come home the way you went out", () => {
    const e = gatewayErrands(gatewayState([seg("lisbon", 0, "2026-10-01", "2026-10-08")], null, null));
    expect(e).toEqual([{ kind: "roundtrip", baseId: "lisbon" }]);
  });

  it("is two bookings for an open jaw", () => {
    // The whole point: an open-jaw trip is two separate tickets, and a
    // checklist that shows one understates the work.
    const e = gatewayErrands(gatewayState(LISBON_PORTO, null, null));
    expect(e).toEqual([
      { kind: "flightIn", baseId: "lisbon" },
      { kind: "flightOut", baseId: "porto" },
    ]);
  });

  it("puts the flights at the top of what is still to book", () => {
    // "Still to book" listed every hotel and every train and never once
    // mentioned getting to the country or home from it.
    const g = gatewayState(LISBON_PORTO, null, null);
    const errands = errandsFor(LISBON_PORTO, g);
    expect(errands[0].kind).toBe("flightIn");
    expect(errands[1].kind).toBe("flightOut");
    expect(errands.some((e) => e.kind === "stay")).toBe(true);
  });

  it("never tells you to book a flight to a city the trip skips", () => {
    // A tester set both ends to Porto on a Lisbon-only trip and the
    // checklist said "Return flights to Porto" — a city appearing nowhere
    // in his itinerary. The row above already flags it; the checklist has
    // nothing useful to add until it is real.
    const lisbonOnly = [seg("lisbon", 0, "2026-10-01", "2026-10-05")];
    expect(gatewayErrands(gatewayState(lisbonOnly, "porto", "porto"))).toEqual([]);
  });

  it("still books the end that is real when only one is missing", () => {
    const lisbonOnly = [seg("lisbon", 0, "2026-10-01", "2026-10-05")];
    expect(gatewayErrands(gatewayState(lisbonOnly, "porto", "lisbon"))).toEqual([
      { kind: "flightOut", baseId: "lisbon" },
    ]);
  });

  it("still works for callers that know nothing about gateways", () => {
    const errands = errandsFor(LISBON_PORTO);
    expect(errands.every((e) => e.kind === "stay" || e.kind === "transport")).toBe(true);
  });
});
