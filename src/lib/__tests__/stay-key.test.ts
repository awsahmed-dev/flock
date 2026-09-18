import { describe, it, expect } from "vitest";
import { stayKeys, parseStayKey, baseOfStay, findStay, stayParam, stayFromParam } from "@/lib/packages/stay-key";

/** the test's own helper, now that production has no use for one */
const indexOfStay = <T extends { baseId: string }>(segs: T[], k: string) => {
  const s = findStay(segs, k);
  return s ? segs.indexOf(s) : -1;
};
import { gatewayState, gatewayErrands } from "@/lib/packages/gateways";
import { fitToTrip } from "@/lib/packages/fit";
import type { Segment } from "@/lib/packages/types";

const segs3 = (ids: string[]): Segment[] =>
  ids.map((baseId, i) => ({
    baseId, order: i, checkIn: "2026-10-05", checkOut: "2026-10-06",
    transportInMode: null, transportInMinutes: null, dayTrips: [], lockedBy: null,
  })) as Segment[];

const segs = (ids: string[]) => ids.map((baseId, i) => ({ baseId, order: i }));

describe("stay keys", () => {
  it("leaves a trip with no repeats exactly as it was", () => {
    // Every existing trip must keep the ids it already has, or every
    // client that has not reloaded starts addressing the wrong stay.
    expect(stayKeys(["jeddah", "riyadh", "alula"])).toEqual(["jeddah", "riyadh", "alula"]);
  });

  it("numbers the return leg, not the first visit", () => {
    expect(stayKeys(["jeddah", "riyadh", "jeddah"])).toEqual(["jeddah", "riyadh", "jeddah#2"]);
  });

  it("counts a third visit too", () => {
    expect(stayKeys(["a", "b", "a", "a"])).toEqual(["a", "b", "a#2", "a#3"]);
  });

  it("round-trips through parse", () => {
    for (const k of ["jeddah", "jeddah#2", "custom:جدة", "custom:جدة#3"]) {
      const { baseId, occurrence } = parseStayKey(k);
      expect(stayKeys(Array(occurrence).fill(baseId))[occurrence - 1]).toBe(k);
    }
  });

  it("does not mistake a city's own name for a visit marker", () => {
    // Split on the last "#", and only when a number follows it.
    expect(baseOfStay("custom:a#b")).toBe("custom:a#b");
    expect(baseOfStay("custom:جدة")).toBe("custom:جدة");
    expect(baseOfStay("jeddah#2")).toBe("jeddah");
    expect(baseOfStay("custom:a#b#2")).toBe("custom:a#b");
  });
});

describe("finding the stay a key means", () => {
  const s = segs(["jeddah", "riyadh", "jeddah"]);

  it("finds each visit separately", () => {
    expect(indexOfStay(s, "jeddah")).toBe(0);
    expect(indexOfStay(s, "riyadh")).toBe(1);
    expect(indexOfStay(s, "jeddah#2")).toBe(2);
  });

  it("treats a bare city id as the first visit", () => {
    // An older client, or any op written before a city could repeat.
    expect(findStay(s, "jeddah")).toBe(s[0]);
  });

  it("returns nothing for a visit that is not there", () => {
    expect(findStay(s, "jeddah#3")).toBeUndefined();
    expect(findStay(s, "mecca")).toBeUndefined();
    expect(indexOfStay(s, "mecca")).toBe(-1);
  });

  it("edits one leg without touching the other", () => {
    // The whole point: removing the return leg must leave the arrival.
    const keys = stayKeys(s.map((x) => x.baseId));
    const drop = findStay(s, "jeddah#2");
    const left = s.filter((x) => x !== drop);
    expect(left.map((x) => x.baseId)).toEqual(["jeddah", "riyadh"]);
    expect(keys).toEqual(["jeddah", "riyadh", "jeddah#2"]);
  });
});

describe("the return leg, as a shape", () => {
  it("is a round trip, not an open jaw", () => {
    // The reason base_id stays the CITY. If the second Jeddah carried a
    // different id, `arrive === depart` would be false and the checklist
    // would tell you to buy two one-way tickets for one return flight.
    const segs = segs3(["jeddah", "riyadh", "jeddah"]);
    const g = gatewayState(segs, "jeddah", "jeddah");
    expect(g.openJaw).toBe(false);
    expect(g.arriveMismatch).toBe(false);
    expect(g.departMismatch).toBe(false);
    expect(gatewayErrands(g)).toEqual([{ kind: "roundtrip", baseId: "jeddah" }]);
  });

  it("is exactly the state that offers the repair, before the leg exists", () => {
    // Jeddah → Riyadh, flying home from Jeddah: the ticket is right, the
    // order is right, the shape is just missing its last night.
    const g = gatewayState(segs3(["jeddah", "riyadh"]), "jeddah", "jeddah");
    expect(g.departMismatch).toBe(true);
    expect(g.departMissing).toBe(false);
  });
});

describe("two stays in one city, measured apart", () => {
  const seg = (baseId: string, order: number, nights: number, checkIn: string): Segment =>
    ({
      baseId, order, checkIn,
      checkOut: new Date(Date.parse(checkIn + "T00:00:00Z") + nights * 86400000)
        .toISOString().slice(0, 10),
      transportInMode: null, transportInMinutes: null, dayTrips: [], lockedBy: null,
    }) as Segment;

  // Jeddah 5 / Riyadh 4 / Jeddah 2 — the shape the return leg creates.
  const trip = () => [
    seg("jeddah", 0, 5, "2026-10-05"),
    seg("riyadh", 1, 4, "2026-10-10"),
    seg("jeddah", 2, 2, "2026-10-14"),
  ];

  it("charges the other stays, never the one just edited", () => {
    // Riyadh 4 → 6 on an 11-night trip: two nights must come from the
    // Jeddah legs, and Riyadh must still be 6 afterwards. Keyed by city,
    // "jeddah" exempted BOTH legs from paying.
    const edited = trip();
    edited[1].checkOut = "2026-10-16";
    const out = fitToTrip(edited, 11, "2026-10-05", "riyadh");
    const nights = (s: Segment) =>
      (Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 86400000;
    expect(out.segments.reduce((n, s) => n + nights(s), 0)).toBe(11);
    expect(nights(out.segments[1])).toBe(6);
  });

  it("can charge the first Jeddah while the second is the one edited", () => {
    const edited = trip();
    edited[2].checkOut = "2026-10-18";
    const out = fitToTrip(edited, 11, "2026-10-05", "jeddah#2");
    const nights = (s: Segment) =>
      (Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 86400000;
    // The edited stay keeps what it was given; the trip still closes.
    expect(nights(out.segments[2])).toBe(4);
    expect(out.segments.reduce((n, s) => n + nights(s), 0)).toBe(11);
  });

  it("reports each stay's own change, not the city's", () => {
    // The toast bug: `before` is keyed by stay, so reading it by city
    // measured the 2-night return leg against the 5-night arrival and
    // announced a four-night move that never happened.
    const keys = stayKeys(trip().map((s) => s.baseId));
    const before = new Map(keys.map((k, i) => [k, [5, 4, 2][i]]));
    const after = [5, 5, 1];
    const deltas = keys.map((k, i) => after[i] - (before.get(k) ?? 0));
    expect(deltas).toEqual([0, 1, -1]);
    // The same arithmetic keyed by city, which is what shipped first.
    const byCity = new Map([["jeddah", 5], ["riyadh", 4]]);
    expect(after[2] - (byCity.get("jeddah") ?? 0)).toBe(-4);
  });
});

describe("a stay key in a URL", () => {
  it("never puts a # in the path", () => {
    // Everything after a "#" is a fragment and never reaches the server.
    expect(stayParam("jeddah#2")).toBe("jeddah~2");
    expect(stayParam("jeddah")).toBe("jeddah");
    expect(stayParam("custom:جدة#2")).toBe("custom:جدة~2");
  });

  it("round-trips", () => {
    for (const k of ["jeddah", "jeddah#2", "custom:جدة", "custom:جدة#3", "kuala_lumpur"]) {
      expect(stayFromParam(stayParam(k))).toBe(k);
    }
  });

  it("accepts a bare city id, as every existing link sends", () => {
    expect(stayFromParam("tokyo")).toBe("tokyo");
    expect(stayFromParam("custom:penang")).toBe("custom:penang");
  });
});

describe("a city page addresses one stay", () => {
  const segs = segs3(["jeddah", "riyadh", "jeddah"]);

  it("reaches the return leg, not the arrival", () => {
    expect(findStay(segs, "jeddah")).toBe(segs[0]);
    expect(findStay(segs, "jeddah#2")).toBe(segs[2]);
  });

  it("knows the return leg is last and the arrival is not", () => {
    // isLast decides who owns the departure day. Compared by CITY, the
    // arrival passed too, and claimed a day that belongs to Riyadh.
    const isLast = (k: string) => indexOfStay(segs, k) === segs.length - 1;
    expect(isLast("jeddah")).toBe(false);
    expect(isLast("jeddah#2")).toBe(true);
    expect(isLast("riyadh")).toBe(false);
  });

  it("offers each other city once in the switcher", () => {
    const siblingsFor = (k: string) => {
      const me = findStay(segs, k)!.baseId;
      return segs
        .filter((sg, i) => sg.baseId !== me && segs.findIndex((x) => x.baseId === sg.baseId) === i)
        .map((sg) => sg.baseId);
    };
    // Riyadh's page used to list Jeddah twice — same name, same link.
    expect(siblingsFor("riyadh")).toEqual(["jeddah"]);
    expect(siblingsFor("jeddah")).toEqual(["riyadh"]);
  });
});

describe("a stay key resolves, a city id is stored", () => {
  it("never lets a stay key become a row's base_id", () => {
    // What a write must store. Storing «jeddah#2» in itinerary_items
    // meant the shape's stranded-row sweep — which looks base ids up
    // among projected days, keyed by CITY — found nothing, decided the
    // city had left the trip, and deleted the row. Fill the return
    // leg, nudge any stay, and the places vanish.
    for (const key of ["jeddah", "jeddah#2", "custom:جدة#3"]) {
      const stored = baseOfStay(key);
      expect(stored).not.toContain("#");
      // and it must be a city the projection will recognise
      expect(stored).toBe(parseStayKey(key).baseId);
    }
  });

  it("resolves the stay the page is showing, not the first one", () => {
    const segs = segs3(["jeddah", "riyadh", "jeddah"]);
    // The page is /city/jeddah~2; the write must land on segment 2.
    expect(findStay(segs, stayFromParam("jeddah~2"))).toBe(segs[2]);
    // ...while the row it writes still says the city.
    expect(baseOfStay(stayFromParam("jeddah~2"))).toBe("jeddah");
  });
});
