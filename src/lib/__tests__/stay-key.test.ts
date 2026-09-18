import { describe, it, expect } from "vitest";
import { stayKeys, parseStayKey, baseOfStay, findStay, indexOfStay } from "@/lib/packages/stay-key";
import { gatewayState, gatewayErrands } from "@/lib/packages/gateways";
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
