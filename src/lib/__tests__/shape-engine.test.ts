/**
 * Allocation + projection, the headless core of «شكل الرحلة».
 *
 * These exist because three earlier versions of "fit a curated route onto a
 * real trip" shipped broken and none was catchable by eye: one repeated the
 * same day nine times, one dropped Kyoto from a 3-day Japan trip, one left
 * 23 consecutive blank days on a 30-day one. The invariants below are the
 * ones that were violated each time.
 */
import { describe, it, expect } from "vitest";
import type { Base, BaseId, Route } from "@/lib/packages/types";
import { allocateNights, routeCapacity, tripNightsBetween, eachDate } from "@/lib/packages/allocate";
import { segmentsFromLegs, projectDays, redate, relink, estimateLeg, segmentNights, errandsFor } from "@/lib/packages/project";

function mkBase(id: string, maxNights: number, opts: Partial<Base> = {}): Base {
  return {
    id,
    name: id,
    nameAr: id,
    country: "JP",
    lat: 35,
    lng: 139,
    photoQuery: id,
    match: [id],
    typicalNights: Math.min(2, maxNights),
    maxNights,
    reachable: [],
    pairsWith: [],
    // one curated shape per allowed night — the invariant the real library must hold
    days: Array.from({ length: maxNights }, (_, i) => ({
      key: `${id}-${i}`,
      title: `${id} day ${i}`,
      titleAr: `${id} ${i}`,
      places: [
        { name: `${id} morning ${i}`, nameAr: "ص", why: "w", whyAr: "و", category: "sight" as const, startTime: "09:00" },
        { name: `${id} evening ${i}`, nameAr: "م", why: "w", whyAr: "و", category: "food" as const, startTime: "19:00" },
      ],
    })),
    ...opts,
  };
}

const BASES: Record<BaseId, Base> = {
  tokyo: mkBase("tokyo", 6, { reachable: ["nara"], pairsWith: ["kyoto"] }),
  kyoto: mkBase("kyoto", 5, { reachable: ["nara"] }),
  osaka: mkBase("osaka", 4),
  nara: mkBase("nara", 0, {
    days: [],
    dayTrip: { key: "nara-dt", title: "Nara", titleAr: "نارا", places: [
      { name: "Todai-ji", nameAr: "تودايجي", why: "w", whyAr: "و", category: "sight", startTime: "10:00" },
    ] },
  }),
};

const ROUTE: Route = {
  id: "japan-classic",
  match: ["japan"],
  title: "Classic", titleAr: "كلاسيكي", subtitle: "s", subtitleAr: "س",
  provenance: "p", provenanceAr: "ب", forWho: "f", forWhoAr: "ف",
  legs: [
    { baseId: "tokyo", nightsRatio: 3 },
    { baseId: "kyoto", nightsRatio: 2 },
    { baseId: "osaka", nightsRatio: 2 },
  ],
  transport: [
    { from: "tokyo", to: "kyoto", mode: "train", minutes: 135 },
    { from: "kyoto", to: "osaka", mode: "train", minutes: 15 },
  ],
  minNights: 7,
};

describe("tripNightsBetween", () => {
  it("counts nights, not days — the last day is a departure", () => {
    // Sep 30 → Oct 6 is 7 calendar days and 6 nights.
    expect(eachDate("2026-09-30", "2026-10-06")).toHaveLength(7);
    expect(tripNightsBetween("2026-09-30", "2026-10-06")).toBe(6);
  });
  it("a one-day trip has no nights", () => {
    expect(tripNightsBetween("2026-09-30", "2026-09-30")).toBe(0);
  });
});

describe("allocateNights", () => {
  it("always allocates exactly the trip's nights, or reports the remainder", () => {
    for (const n of [1, 2, 3, 5, 7, 10, 14, 20, 30, 60]) {
      const a = allocateNights(ROUTE, BASES, n);
      const sum = a.legs.reduce((x, l) => x + l.nights, 0);
      expect(sum + a.overflow).toBe(n);
    }
  });

  it("keeps every base on a short trip instead of dropping the later ones", () => {
    const a = allocateNights(ROUTE, BASES, 3);
    expect(a.legs.map((l) => l.baseId)).toEqual(["tokyo", "kyoto", "osaka"]);
    expect(a.legs.every((l) => l.nights === 1)).toBe(true);
    expect(a.dropped).toEqual([]);
  });

  it("drops from the tail — and says so — when the trip is shorter than the route", () => {
    const a = allocateNights(ROUTE, BASES, 2);
    expect(a.legs.map((l) => l.baseId)).toEqual(["tokyo", "kyoto"]);
    expect(a.dropped).toEqual(["osaka"]);
  });

  it("never exceeds a base's useful maximum — no 13 nights in Tokyo", () => {
    const a = allocateNights(ROUTE, BASES, 30);
    for (const l of a.legs) expect(l.nights).toBeLessThanOrEqual(BASES[l.baseId].maxNights);
    // capacity is 6+5+4 = 15, so a 30-night trip overflows by 15
    expect(routeCapacity(ROUTE, BASES)).toBe(15);
    expect(a.overflow).toBe(15);
  });

  it("reports overflow rather than inflating, so the UI can offer more bases", () => {
    const a = allocateNights(ROUTE, BASES, 20);
    expect(a.overflow).toBe(5);
    expect(a.legs.reduce((x, l) => x + l.nights, 0)).toBe(15);
  });

  it("respects the ratio when there is room", () => {
    const a = allocateNights(ROUTE, BASES, 7);
    expect(a.legs.map((l) => l.nights)).toEqual([3, 2, 2]);
  });

  it("carries the curated transport onto each leg after the first", () => {
    const a = allocateNights(ROUTE, BASES, 7);
    expect(a.legs[0].transportInMode).toBeNull();
    expect(a.legs[1]).toMatchObject({ transportInMode: "train", transportInMinutes: 135 });
    expect(a.legs[2]).toMatchObject({ transportInMode: "train", transportInMinutes: 15 });
  });
});

describe("projectDays", () => {
  const segsFor = (nights: number, start = "2026-09-30") =>
    segmentsFromLegs(allocateNights(ROUTE, BASES, nights).legs, start);

  it("emits one day per trip date — nights plus the departure day", () => {
    for (const n of [1, 3, 7, 14]) {
      const days = projectDays(segsFor(n), BASES, "2026-09-30");
      const allocated = allocateNights(ROUTE, BASES, n).legs.reduce((x, l) => x + l.nights, 0);
      expect(days).toHaveLength(allocated + 1);
    }
  });

  it("dates are contiguous and start on the trip's first day", () => {
    const days = projectDays(segsFor(7), BASES, "2026-09-30");
    expect(days[0].date).toBe("2026-09-30");
    expect(days[days.length - 1].date).toBe("2026-10-07");
    for (let i = 1; i < days.length; i++) {
      const prev = Date.parse(days[i - 1].date + "T00:00:00Z");
      expect(Date.parse(days[i].date + "T00:00:00Z") - prev).toBe(86_400_000);
    }
  });

  it("treats the first day at every base as an arrival, and thins it", () => {
    const days = projectDays(segsFor(7), BASES, "2026-09-30");
    const travel = days.filter((d) => d.travel);
    // three arrivals: the flight in, plus Kyoto and Osaka by train
    expect(travel).toHaveLength(3);
    expect(days[0].travel).toBe(true);
    // an arrival afternoon must not carry a 09:00 stop
    for (const d of travel) {
      expect(d.places.every((p) => parseInt((p.startTime ?? "12").slice(0, 2), 10) >= 14)).toBe(true);
    }
  });

  it("only renames a day when you arrived from another base", () => {
    const days = projectDays(segsFor(7), BASES, "2026-09-30");
    // day one keeps its curated title — it is already an arrival story
    expect(days[0].title).not.toMatch(/^Arrive in/);
    const kyotoArrival = days.find((d) => d.travel && d.baseId === "kyoto");
    expect(kyotoArrival!.title).toBe("Arrive in kyoto");
  });

  it("relinks the legs after a reorder", () => {
    const segs = segsFor(7);
    // drag Kyoto above Tokyo: Kyoto now opens the trip, Tokyo now follows it
    const swapped = [segs[1], segs[0], segs[2]].map((s, i) => ({ ...s, order: i }));
    const out = relink(redate(swapped, "2026-09-30"), BASES);
    // the opening base arrives from nowhere
    expect(out[0].transportInMode).toBeNull();
    expect(out[0].transportInMinutes).toBeNull();
    // ...and Tokyo, now mid-route, gets a leg instead of silently having none
    expect(out[1].transportInMode).not.toBeNull();
    expect(out[1].transportInMinutes).toBeGreaterThan(0);
  });

  it("estimates a leg from real distance, and flies when it's far", () => {
    const near = estimateLeg(BASES.tokyo, { ...BASES.kyoto, lat: 35.5, lng: 139.5 });
    expect(near.transportInMode).toBe("train");
    const far = estimateLeg(BASES.tokyo, { ...BASES.osaka, lat: 43.06, lng: 141.35 });
    expect(far.transportInMode).toBe("flight");
  });

  it("gives the departure day a morning only", () => {
    const days = projectDays(segsFor(7), BASES, "2026-09-30");
    const last = days[days.length - 1];
    expect(last.departure).toBe(true);
    expect(last.places.length).toBeLessThanOrEqual(1);
  });

  it("never repeats a curated shape within one stay", () => {
    const days = projectDays(segsFor(14), BASES, "2026-09-30");
    const byBase = new Map<string, string[]>();
    for (const d of days) {
      if (d.travel || d.departure || d.dayTripTo) continue;
      const list = byBase.get(d.baseId) ?? [];
      list.push(d.title);
      byBase.set(d.baseId, list);
    }
    for (const [, titles] of byBase) expect(new Set(titles).size).toBe(titles.length);
  });

  it("produces no blank day, because a base is never over-allocated", () => {
    for (const n of [3, 7, 10, 15]) {
      const days = projectDays(segsFor(n), BASES, "2026-09-30");
      const blank = days.filter((d) => !d.departure && d.places.length === 0);
      expect(blank).toEqual([]);
    }
  });

  it("spends a day trip away from the base, never on the arrival day", () => {
    const segs = segsFor(7);
    segs[1].dayTrips = ["nara"]; // kyoto → nara
    const days = projectDays(segs, BASES, "2026-09-30");
    const trip = days.find((d) => d.dayTripTo === "nara");
    expect(trip).toBeTruthy();
    expect(trip!.travel).toBe(false);
    expect(trip!.titleAr).toBe("نارا");
  });
});

describe("redate", () => {
  it("re-dates back-to-back after a reorder, preserving each stay's length", () => {
    const segs = segsFromNights([3, 2, 2]);
    const swapped = [segs[2], segs[0], segs[1]].map((s, i) => ({ ...s, order: i }));
    const out = redate(swapped, "2026-09-30");
    expect(out.map(segmentNights)).toEqual([2, 3, 2]);
    expect(out[0].checkIn).toBe("2026-09-30");
    expect(out[0].checkOut).toBe(out[1].checkIn);
    expect(out[1].checkOut).toBe(out[2].checkIn);
    expect(out[2].checkOut).toBe("2026-10-07");
  });

  function segsFromNights(ns: number[]) {
    return segmentsFromLegs(
      ns.map((n, i) => ({
        baseId: ["tokyo", "kyoto", "osaka"][i],
        nights: n,
        transportInMode: i ? ("train" as const) : null,
        transportInMinutes: i ? 100 : null,
      })),
      "2026-09-30",
    );
  }
});

describe("errandsFor", () => {
  it("lists a stay per base and a leg per move, and knows what's booked", () => {
    const segs = segmentsFromLegs(allocateNights(ROUTE, BASES, 7).legs, "2026-09-30");
    segs[0].lockedBy = "hotel";
    const e = errandsFor(segs);
    expect(e.filter((x) => x.kind === "stay")).toHaveLength(3);
    expect(e.filter((x) => x.kind === "transport")).toHaveLength(2);
    expect(e.find((x) => x.kind === "stay" && x.baseId === "tokyo")!.done).toBe(true);
    expect(e.find((x) => x.kind === "stay" && x.baseId === "kyoto")!.done).toBe(false);
  });
});
