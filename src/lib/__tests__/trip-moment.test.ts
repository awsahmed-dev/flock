import { describe, it, expect } from "vitest";
import { tripMoment, dayMoment } from "@/lib/trip-moment";

const trip = { startDate: "2026-10-06", endDate: "2026-10-12" };

describe("tripMoment — the one clock beside tripPhase", () => {
  it("T−49: PLANNING · far · nothing due but decisions/stops/crew", () => {
    const m = tripMoment(trip, "2026-08-18");
    expect(m.phase).toBe("PLANNING"); expect(m.window).toBe("far"); expect(m.daysToStart).toBe(49);
    expect(m.due).toEqual({ budget: false, docs: false, packing: false });
  });
  it("T−10: PLANNING · near · budget due, docs/packing not", () => {
    const m = tripMoment(trip, "2026-09-26");
    expect(m.window).toBe("near"); expect(m.due).toEqual({ budget: true, docs: false, packing: false });
  });
  it("T−3: DEPARTURE · docs due, packing not until T−2", () => {
    const m = tripMoment(trip, "2026-10-03");
    expect(m.phase).toBe("DEPARTURE"); expect(m.window).toBeNull(); expect(m.due).toEqual({ budget: true, docs: true, packing: false });
    expect(tripMoment(trip, "2026-10-04").due.packing).toBe(true);
  });
  it("LIVE: day index, first/last day, everything due", () => {
    expect(tripMoment(trip, "2026-10-06")).toMatchObject({ phase: "LIVE", dayIndex: 0, isFirstDay: true, isLastDay: false, totalDays: 7 });
    expect(tripMoment(trip, "2026-10-12")).toMatchObject({ phase: "LIVE", dayIndex: 6, isFirstDay: false, isLastDay: true, daysToEnd: 0 });
    expect(tripMoment(trip, "2026-10-09").due).toEqual({ budget: true, docs: true, packing: true });
  });
  it("RECAP: after the end", () => {
    expect(tripMoment(trip, "2026-10-14")).toMatchObject({ phase: "RECAP", dayIndex: null, daysToEnd: -2 });
  });
});

describe("dayMoment — the evening recap can no longer lie", () => {
  const stops = [
    { id: "a", startTime: "10:00", done: true },
    { id: "b", startTime: "13:00", done: false },
    { id: "c", startTime: "18:00", done: false },
    { id: "d", startTime: "23:10", done: false },
  ];
  it("21:59 with a 23:10 flight outstanding: NO recap (the audit's exact scenario)", () => {
    const d = dayMoment(stops, "21:59");
    expect(d.eveningRecap).toBe(false);
    expect(d.aheadTimed).toBe(1); expect(d.passedUnmarked).toBe(2); expect(d.windingDown).toBe(true);
    expect(d.nextId).toBe("d"); expect(d.minutesToNext).toBe(71);
  });
  it("21:59 with nothing timed ahead: recap fires (the clock may suggest once the itinerary agrees)", () => {
    expect(dayMoment(stops.slice(0, 3), "21:59").eveningRecap).toBe(true);
  });
  it("all done at 15:00: recap fires early, as before", () => {
    expect(dayMoment(stops.map((s) => ({ ...s, done: true })), "15:00")).toMatchObject({ allDone: true, eveningRecap: true, nextId: null });
  });
  it("auto-advance: a stop 5 min gone is still next; 6 min gone is skipped", () => {
    expect(dayMoment(stops, "13:05").nextId).toBe("b");
    expect(dayMoment(stops, "13:06").nextId).toBe("c");
  });
  it("anchors don't count as stops to do; untimed undone stops keep the day open until 21:00", () => {
    const d = dayMoment([{ id: "f", startTime: "09:00", done: false, anchor: true }, { id: "x", startTime: null, done: false }], "20:00");
    expect(d.total).toBe(1); expect(d.untimed).toBe(1); expect(d.eveningRecap).toBe(false); expect(d.nextId).toBe("x");
    expect(dayMoment([{ id: "x", startTime: null, done: false }], "21:00").eveningRecap).toBe(true);
  });
});
