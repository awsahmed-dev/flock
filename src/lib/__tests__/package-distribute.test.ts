/**
 * Regression tests for fitting a curated route onto an arbitrary trip length.
 *
 * Both earlier implementations shipped broken and both looked fine in the
 * happy case (a trip exactly as long as the route), which is exactly why
 * these exist:
 *  · v1 clamped, so a 15-day Japan trip repeated "last morning" nine times.
 *  · v2 used each curated day once then padded, so a 3-day Japan trip lost
 *    Kyoto and Osaka entirely and a 30-day one ended in 23 blank days.
 */
import { describe, it, expect } from "vitest";
import { distributeDays } from "@/lib/packages/distribute";
import { CANONICAL_PACKAGES, findCanonical } from "@/lib/packages/canonical";

const JAPAN = findCanonical("Japan")!;

describe("distributeDays", () => {
  it("always returns exactly one slot per trip day", () => {
    for (const canon of CANONICAL_PACKAGES) {
      for (const d of [1, 2, 3, 5, 7, 8, 14, 15, 30, 60]) {
        expect(distributeDays(canon, d)).toHaveLength(d);
      }
    }
  });

  it("never repeats a curated day", () => {
    for (const canon of CANONICAL_PACKAGES) {
      for (const d of [1, 3, 7, 15, 30]) {
        const used = distributeDays(canon, d).map((s) => s.shape).filter(Boolean);
        expect(new Set(used).size).toBe(used.length);
      }
    }
  });

  it("keeps every city on a short trip rather than dropping the later ones", () => {
    // The v2 bug: 3 days of Japan returned Tokyo, Tokyo, Tokyo.
    const cities = new Set(distributeDays(JAPAN, 3).map((s) => s.city));
    expect(cities).toEqual(new Set(["Tokyo", "Kyoto", "Osaka"]));
  });

  it("gives a one-day trip the first city, not the last", () => {
    const slots = distributeDays(JAPAN, 1);
    expect(slots).toHaveLength(1);
    expect(slots[0].city).toBe("Tokyo");
    expect(slots[0].shape).not.toBeNull();
  });

  it("spreads free days through a long trip instead of stacking them at the end", () => {
    for (const d of [15, 30, 60]) {
      const slots = distributeDays(JAPAN, d);
      // v2 left every blank in one run at the end (23 of them on a 30-day
      // trip). Free days are unavoidable when the trip outruns the curated
      // route — they just must not all land together.
      let run = 0;
      let longest = 0;
      for (const s of slots) {
        run = s.shape ? 0 : run + 1;
        longest = Math.max(longest, run);
      }
      expect(longest).toBeLessThan(d / 2);
      // every city still gets real content, however long the trip
      const withContent = new Set(slots.filter((s) => s.shape).map((s) => s.city));
      expect(withContent).toEqual(new Set(["Tokyo", "Kyoto", "Osaka"]));
    }
  });

  it("labels a free day with the city the traveller is actually in", () => {
    for (const s of distributeDays(JAPAN, 30)) {
      expect(s.city).toBeTruthy();
      expect(JAPAN.cities.map((c) => c.name)).toContain(s.city);
      if (s.shape) expect(s.shape.city).toBe(s.city);
    }
  });

  it("keeps cities in route order", () => {
    const order = distributeDays(JAPAN, 12).map((s) => s.city);
    const firstSeen = [...new Set(order)];
    expect(firstSeen).toEqual(["Tokyo", "Kyoto", "Osaka"]);
  });

  it("handles a trip shorter than the number of cities", () => {
    const slots = distributeDays(JAPAN, 2);
    expect(slots).toHaveLength(2);
    expect(new Set(slots.map((s) => s.city)).size).toBe(2);
  });

  it("returns nothing for a zero-length trip", () => {
    expect(distributeDays(JAPAN, 0)).toEqual([]);
  });
});
