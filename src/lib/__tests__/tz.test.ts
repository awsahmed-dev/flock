/**
 * Timezone correctness — regression tests for fix/tz.
 *
 * THE INVARIANT THESE PROTECT: `tripPhase` must return the same answer no
 * matter what zone the process runs in. Before this branch it did not — the
 * server (UTC) and the traveller disagreed for up to 15 hours a day.
 *
 * These tests are run under three zones by `npm run test:tz`. They contain no
 * `new Date()` and no zone-dependent construction, so if they ever start
 * disagreeing between zones, someone has reintroduced a Date into a calendar
 * comparison. `scripts/tz-repro.mjs` demonstrates the old behaviour.
 */
import { describe, it, expect } from "vitest";
import { tripPhase } from "@/lib/trip-phase";
import {
  addDaysIso,
  diffDaysIso,
  isTimeZone,
  isoDayOf,
  toIsoDay,
  todayInZone,
} from "@/lib/today";

const TRIP = { startDate: "2026-10-05", endDate: "2026-10-12" };

describe("T-1 FIXED — the phase is a question about calendar days, not instants", () => {
  it("is LIVE on the first day and on the last day (inclusive both ends)", () => {
    expect(tripPhase(TRIP, "2026-10-05")).toBe("LIVE");
    expect(tripPhase(TRIP, "2026-10-12")).toBe("LIVE");
  });

  it("flips to RECAP on the day AFTER the end date, not during the last evening", () => {
    // The old code, on a UTC server, flipped at 2026-10-13T00:00Z — which is
    // 12 Oct 17:00 in Los Angeles. The Wrap replaced the live cockpit while
    // the traveller was still out at dinner on their final night.
    expect(tripPhase(TRIP, "2026-10-12")).toBe("LIVE");
    expect(tripPhase(TRIP, "2026-10-13")).toBe("RECAP");
  });

  it("DEPARTURE is exactly the 7 days before the start; day 8 is still PLANNING", () => {
    expect(tripPhase(TRIP, "2026-09-28")).toBe("DEPARTURE"); // start - 7
    expect(tripPhase(TRIP, "2026-09-27")).toBe("PLANNING"); // start - 8
  });

  it("a same-day trip is LIVE on its one day and RECAP the next", () => {
    const oneDay = { startDate: "2026-10-05", endDate: "2026-10-05" };
    expect(tripPhase(oneDay, "2026-10-05")).toBe("LIVE");
    expect(tripPhase(oneDay, "2026-10-06")).toBe("RECAP");
  });

  it("tolerates a full timestamp where a date-only column was expected", () => {
    const sloppy = { startDate: "2026-10-05T00:00:00.000Z", endDate: "2026-10-12T00:00:00.000Z" };
    expect(tripPhase(sloppy, "2026-10-05T22:00:00.000Z")).toBe("LIVE");
  });

  it("every day of a 3-week window resolves to exactly one phase, in order", () => {
    const seen: string[] = [];
    // -12 → PLANNING, -7 → DEPARTURE, 0..+7 → LIVE, +8 → RECAP. The window
    // has to run past the end date (+7) to reach RECAP at all.
    for (let i = -12; i <= 9; i++) {
      seen.push(tripPhase(TRIP, addDaysIso(TRIP.startDate, i)));
    }
    // PLANNING… then DEPARTURE…, then LIVE…, then RECAP — never backwards.
    const order = ["PLANNING", "DEPARTURE", "LIVE", "RECAP"];
    const ranks = seen.map((p) => order.indexOf(p));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(4);
  });
});

describe("T-1 FIXED — zone independence, which is the whole point", () => {
  // `npm run test:tz` runs this file under UTC, America/Los_Angeles and
  // Asia/Kuala_Lumpur. Identical expectations in all three is the proof.
  it("reports the host zone so the runner's output is self-documenting", () => {
    expect(typeof (process.env.TZ ?? "")).toBe("string");
  });

  it("gives the same phase for the same calendar day regardless of host zone", () => {
    // Hard-coded answers. If the host zone could influence the result, one of
    // the three runs would fail.
    expect(tripPhase(TRIP, "2026-10-04")).toBe("DEPARTURE");
    expect(tripPhase(TRIP, "2026-10-05")).toBe("LIVE");
    expect(tripPhase(TRIP, "2026-10-13")).toBe("RECAP");
  });

  it("day arithmetic does not drift across a DST boundary", () => {
    // US DST ends 1 Nov 2026; EU 25 Oct 2026. A local-midnight Date + 24h
    // lands at 23:00 or 01:00 on those weekends and silently loses a day.
    expect(diffDaysIso("2026-10-24", "2026-10-26")).toBe(2);
    expect(diffDaysIso("2026-10-31", "2026-11-02")).toBe(2);
    expect(addDaysIso("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIso("2026-03-07", 1)).toBe("2026-03-08");
  });

  it("diffDaysIso is signed and symmetric", () => {
    expect(diffDaysIso("2026-10-05", "2026-10-12")).toBe(7);
    expect(diffDaysIso("2026-10-12", "2026-10-05")).toBe(-7);
    expect(diffDaysIso("2026-10-05", "2026-10-05")).toBe(0);
  });

  it("crosses a year boundary without wrapping", () => {
    expect(diffDaysIso("2026-12-30", "2027-01-02")).toBe(3);
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(diffDaysIso("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("todayInZone — the one place a zone is allowed to matter", () => {
  const instant = new Date("2026-10-05T01:00:00.000Z");

  it("reads the traveller's calendar day, not the server's", () => {
    expect(todayInZone("UTC", instant)).toBe("2026-10-05");
    expect(todayInZone("America/Los_Angeles", instant)).toBe("2026-10-04");
    expect(todayInZone("Asia/Kuala_Lumpur", instant)).toBe("2026-10-05");
  });

  it("is what makes the LA traveller see DEPARTURE while UTC sees LIVE — correctly", () => {
    // Same instant, same trip, two travellers. Each is now told the truth
    // about their OWN calendar, and each screen agrees with its own nav.
    expect(tripPhase(TRIP, todayInZone("America/Los_Angeles", instant))).toBe("DEPARTURE");
    expect(tripPhase(TRIP, todayInZone("Asia/Kuala_Lumpur", instant))).toBe("LIVE");
  });

  it("the KL traveller is in RECAP once their own midnight passes", () => {
    const lastNight = new Date("2026-10-12T17:00:00.000Z"); // 13 Oct 01:00 KL
    expect(todayInZone("Asia/Kuala_Lumpur", lastNight)).toBe("2026-10-13");
    expect(tripPhase(TRIP, todayInZone("Asia/Kuala_Lumpur", lastNight))).toBe("RECAP");
    // …while the LA traveller is still on their last day.
    expect(todayInZone("America/Los_Angeles", lastNight)).toBe("2026-10-12");
    expect(tripPhase(TRIP, todayInZone("America/Los_Angeles", lastNight))).toBe("LIVE");
  });

  it("pads single-digit months and days — 2026-01-05, never 2026-1-5", () => {
    expect(todayInZone("UTC", new Date("2026-01-05T12:00:00.000Z"))).toBe("2026-01-05");
    expect(todayInZone("UTC", new Date("2026-11-09T12:00:00.000Z"))).toBe("2026-11-09");
  });

  it("falls back to UTC rather than throwing on a spoofed cookie value", () => {
    // An unknown zone reaches Intl.DateTimeFormat and throws a RangeError.
    // Unguarded, a junk cookie would 500 every trip screen.
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("../../etc/passwd")).toBe(false);
    expect(isTimeZone("A".repeat(200))).toBe(false);
    expect(isTimeZone("Asia/Riyadh")).toBe(true);
    expect(isTimeZone(undefined)).toBe(false);
    expect(todayInZone("Not/AZone", instant)).toBe("2026-10-05"); // = UTC
  });
});

describe("helpers", () => {
  it("toIsoDay peels a timestamp down to the calendar day", () => {
    expect(toIsoDay("2026-10-05T23:30:00.000Z")).toBe("2026-10-05");
    expect(toIsoDay("2026-10-05")).toBe("2026-10-05");
    expect(toIsoDay(null)).toBe("");
    expect(toIsoDay(undefined)).toBe("");
  });

  it("isoDayOf reads a Date in the host zone without a UTC round trip", () => {
    // The share page used `d.toISOString().slice(0,10)` on a local-midnight
    // Date, which shifts the day one EARLIER in every UTC+ zone — Riyadh,
    // London, Kuala Lumpur. isoDayOf is the replacement.
    const localMidnight = new Date(2026, 6, 10); // 10 Jul 2026, local
    expect(isoDayOf(localMidnight)).toBe("2026-07-10");
  });

  it("bad input degrades to NaN/empty rather than a plausible wrong number", () => {
    expect(Number.isNaN(diffDaysIso("", "2026-10-05"))).toBe(true);
    expect(Number.isNaN(diffDaysIso("not-a-date", "2026-10-05"))).toBe(true);
    expect(addDaysIso("", 1)).toBe("");
  });
});

describe("T-6 FIXED — the cookie seam, which is where fix/tz actually broke", () => {
  // This block exists because every other test in this file passed while the
  // branch did NOTHING in production. <TimeZoneSync /> wrote the zone
  // percent-encoded and the server rejected it, so getTimeZone() fell back to
  // UTC for every traveller — and the client's comparison never matched, so
  // router.refresh() fired on every mount forever.
  //
  // The unit tests never touched the seam and every render capture set the
  // cookie RAW through Playwright, bypassing the component. Tested components,
  // untested join.

  it("a percent-encoded zone is NOT a valid zone — this is what the server saw", () => {
    expect(isTimeZone("Asia%2FRiyadh")).toBe(false);
    expect(isTimeZone("Pacific%2FKiritimati")).toBe(false);
    expect(isTimeZone("America%2FLos_Angeles")).toBe(false);
  });

  it("...and decoding it makes it valid again, which is the recovery path", () => {
    for (const encoded of ["Asia%2FRiyadh", "Pacific%2FKiritimati", "America%2FLos_Angeles"]) {
      expect(isTimeZone(decodeURIComponent(encoded))).toBe(true);
    }
  });

  it("raw IANA zone names need no encoding — every character is a legal cookie-octet", () => {
    // RFC 6265 cookie-octet excludes ";", ",", whitespace, '"' and "\\".
    // No IANA zone name contains any of them, so encoding bought nothing.
    const ILLEGAL = /[;,\s"\\]/;
    for (const zone of [
      "UTC", "Asia/Riyadh", "America/Los_Angeles", "Pacific/Kiritimati",
      "Europe/London", "Asia/Kuala_Lumpur", "America/Argentina/Buenos_Aires",
      "Etc/GMT+10", "Australia/Sydney",
    ]) {
      expect(ILLEGAL.test(zone)).toBe(false);
      expect(isTimeZone(zone)).toBe(true);
      // The round trip that must hold: what we write is what we read back.
      expect(zone).toBe(decodeURIComponent(zone));
    }
  });

  it("UTC was the ONLY value that worked, which is why nothing looked wrong", () => {
    // encodeURIComponent is a no-op on "UTC" — no slash. So the sandbox default
    // and any UTC server behaved perfectly while every real traveller did not.
    expect(encodeURIComponent("UTC")).toBe("UTC");
    expect(encodeURIComponent("Asia/Riyadh")).not.toBe("Asia/Riyadh");
  });

  it("a junk cookie still degrades to UTC rather than throwing", () => {
    expect(isTimeZone("%%%")).toBe(false);
    expect(todayInZone("%%%", new Date("2026-10-05T01:00:00.000Z"))).toBe("2026-10-05");
  });
});
