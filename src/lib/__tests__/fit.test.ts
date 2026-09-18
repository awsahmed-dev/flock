import { describe, it, expect } from "vitest";
import { fitToTrip } from "@/lib/packages/fit";
import { segmentNights } from "@/lib/packages/project";
import { addDays } from "@/lib/packages/allocate";
import type { Segment } from "@/lib/packages/types";

/**
 * "When I create the trip I choose the duration — two weeks, one week —
 * and then in planning it doesn't respect it. If I add more cities it adds
 * five, six, seven days more than the trip."
 *
 * The dates are the one thing the user settled before any of this started.
 * Every test here asserts the same single property from a different angle:
 * whatever you do to the shape, it still covers the trip exactly.
 */

function seg(baseId: string, order: number, checkIn: string, nights: number): Segment {
  return {
    baseId,
    order,
    checkIn,
    checkOut: addDays(checkIn, nights),
    transportInMode: order === 0 ? null : "train",
    transportInMinutes: order === 0 ? null : 120,
    dayTrips: [],
    lockedBy: null,
  };
}

const START = "2026-10-14";

/** The property, stated once and reused everywhere. */
function covers(segments: Segment[], tripNights: number) {
  const total = segments.reduce((n, s) => n + segmentNights(s), 0);
  expect(total, `covers ${total} nights, trip is ${tripNights}`).toBe(tripNights);
  if (!segments.length) return;
  expect(segments[0].checkIn, "starts on the trip's first day").toBe(START);
  expect(segments[segments.length - 1].checkOut, "ends on the trip's last day").toBe(
    addDays(START, tripNights),
  );
  // back-to-back, no gap and no overlap
  for (let i = 1; i < segments.length; i++) {
    expect(segments[i].checkIn, `gap or overlap before ${segments[i].baseId}`).toBe(
      segments[i - 1].checkOut,
    );
  }
  for (const s of segments) expect(segmentNights(s)).toBeGreaterThanOrEqual(1);
}

describe("the shape always covers the trip", () => {
  it("leaves a shape that already fits alone", () => {
    const segs = [seg("kuala_lumpur", 0, START, 7), seg("langkawi", 1, addDays(START, 7), 7)];
    const { segments, dropped } = fitToTrip(segs, 14, START);
    covers(segments, 14);
    expect(dropped).toEqual([]);
  });

  it("absorbs a city added out of thin air", () => {
    // What "add a city" looks like before fitting: a stay appended with
    // nights nobody has paid for yet.
    const segs = [
      seg("kuala_lumpur", 0, START, 7),
      seg("langkawi", 1, addDays(START, 7), 7),
      seg("custom:penang", 2, addDays(START, 14), 3),
    ];
    const { segments } = fitToTrip(segs, 14, START);
    covers(segments, 14);
    expect(segments.map((s) => s.baseId)).toContain("custom:penang");
  });

  it("absorbs five cities added one after another", () => {
    // The user's own sequence. Each add appends nights; after every single
    // one the trip must still end on the day he chose.
    let segs = [seg("kuala_lumpur", 0, START, 14)];
    for (const [i, city] of ["langkawi", "penang", "malacca", "ipoh", "kuching"].entries()) {
      const tail = segs[segs.length - 1];
      segs = [...segs, seg(`custom:${city}`, i + 1, tail.checkOut, 2)];
      segs = fitToTrip(segs, 14, START).segments;
      covers(segs, 14);
    }
    expect(segs).toHaveLength(6);
  });

  it("drops whole cities when the trip is shortened hard, and says which", () => {
    const segs = [
      seg("tokyo", 0, START, 7),
      seg("kyoto", 1, addDays(START, 7), 4),
      seg("osaka", 2, addDays(START, 11), 3),
    ];
    const { segments, dropped } = fitToTrip(segs, 2, START);
    covers(segments, 2);
    expect(dropped.length, "losing a city in silence is the bug").toBeGreaterThan(0);
  });

  it("grows the shape when the trip gets longer", () => {
    const segs = [seg("tokyo", 0, START, 3)];
    covers(fitToTrip(segs, 30, START).segments, 30);
  });

  it("never charges the stay the user just edited", () => {
    // Editing the LAST city on a fully covered trip used to find that same
    // city first and silently undo the edit — its stepper was dead.
    const segs = [seg("tokyo", 0, START, 7), seg("osaka", 1, addDays(START, 7), 8)];
    const { segments } = fitToTrip(segs, 14, START, "osaka");
    covers(segments, 14);
    expect(segmentNights(segments.find((s) => s.baseId === "osaka")!), "the edit stuck").toBe(8);
    expect(segmentNights(segments.find((s) => s.baseId === "tokyo")!)).toBe(6);
  });

  it("still closes when the only stay left is the one just edited", () => {
    const segs = [seg("tokyo", 0, START, 9)];
    covers(fitToTrip(segs, 7, START, "tokyo").segments, 7);
  });

  it("respects a booked stay", () => {
    const segs = [
      { ...seg("tokyo", 0, START, 4), lockedBy: "hotel" as const },
      seg("osaka", 1, addDays(START, 4), 9),
    ];
    const { segments } = fitToTrip(segs, 10, START);
    covers(segments, 10);
    expect(segmentNights(segments.find((s) => s.baseId === "tokyo")!), "booked nights moved").toBe(4);
  });

  it("holds across a hundred random edits", () => {
    // The property, fuzzed. Any add, removal or nights change, in any
    // order, on any trip length — the dates still close.
    let rng = 42;
    const rand = (n: number) => ((rng = (rng * 1103515245 + 12345) % 2147483648), rng % n);
    let segs = [seg("a", 0, START, 6)];
    let tripNights = 6;

    for (let i = 0; i < 100; i++) {
      const move = rand(4);
      if (move === 0) {
        const tail = segs[segs.length - 1];
        segs = [...segs, seg(`c${i}`, segs.length, tail.checkOut, 1 + rand(4))];
      } else if (move === 1 && segs.length > 1) {
        segs = segs.filter((_, ix) => ix !== rand(segs.length));
      } else if (move === 2) {
        const ix = rand(segs.length);
        segs = segs.map((s, j) =>
          j === ix ? { ...s, checkOut: addDays(s.checkIn, 1 + rand(9)) } : s,
        );
      } else {
        tripNights = 1 + rand(25);
      }
      segs = fitToTrip(segs, tripNights, START).segments;
      covers(segs, tripNights);
    }
  });
});
