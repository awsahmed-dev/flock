import { describe, it, expect } from "vitest";
import { dailyPace } from "@/lib/daily-pace";
import { splitWithOutside, netByContact, ME } from "@/lib/outside-people";

describe("dailyPace", () => {
  // The owner's real Saudi trip: SAR 7,000, 6 Oct – 6 Nov (32 days), with
  // flights (~SAR 2,290) bought on 12 Sep. The old tracker said 219/day.
  const saudi = {
    startDate: "2026-10-06",
    endDate: "2026-11-06",
    budget: 7000,
    expenses: [{ date: "2026-09-12", amount: 2290 }],
  };

  it("takes money spent before the trip off the daily plan", () => {
    const p = dailyPace({ ...saudi, today: "2026-09-25" });
    expect(p.tripDays).toBe(32);
    expect(p.preTrip).toBe(2290);
    expect(p.planPerDay).toBeCloseTo((7000 - 2290) / 32, 5); // ≈147.19, not 218.75
    expect(p.allowanceFromToday).toBeCloseTo(p.planPerDay!, 5); // nothing spent in-trip yet
    expect(p.daysLeft).toBe(32);
    // pre-trip spend is not on any day's row
    expect(p.byDay.every((d) => d.spent === 0)).toBe(true);
  });

  it("an overspent day lowers the allowance for the rest, not the plan", () => {
    const p = dailyPace({
      ...saudi,
      expenses: [...saudi.expenses, { date: "2026-10-06", amount: 600 }],
      today: "2026-10-07",
    });
    expect(p.planPerDay).toBeCloseTo(4710 / 32, 5); // fixed
    expect(p.daysLeft).toBe(31);
    expect(p.allowanceFromToday).toBeCloseTo((7000 - 2290 - 600) / 31, 5);
    expect(p.byDay[0].spent).toBe(600);
  });

  it("today's own spend is inside today's allowance, not taken from it", () => {
    const before = dailyPace({ ...saudi, today: "2026-10-10" });
    const after = dailyPace({
      ...saudi,
      expenses: [...saudi.expenses, { date: "2026-10-10", amount: 90 }],
      today: "2026-10-10",
    });
    expect(after.allowanceFromToday).toBeCloseTo(before.allowanceFromToday!, 5);
  });

  it("no budget: no targets, still a per-day record", () => {
    const p = dailyPace({ ...saudi, budget: null, today: "2026-10-08" });
    expect(p.planPerDay).toBeNull();
    expect(p.allowanceFromToday).toBeNull();
    expect(p.byDay).toHaveLength(32);
  });

  it("after the trip there is nothing left to pace", () => {
    const p = dailyPace({ ...saudi, today: "2026-11-20" });
    expect(p.daysLeft).toBe(0);
    expect(p.allowanceFromToday).toBeNull();
  });

  it("flags a budget spent entirely before the trip", () => {
    const p = dailyPace({ ...saudi, expenses: [{ date: "2026-09-01", amount: 7500 }], today: "2026-09-25" });
    expect(p.budgetGoneBeforeTrip).toBe(true);
    expect(p.planPerDay).toBe(0);
  });
});

describe("splitWithOutside", () => {
  it("I paid for three: each of the other two owes me a third", () => {
    const r = splitWithOutside({ bill: 200, currency: "SAR", contactIds: ["khalid", "omar"], payer: ME });
    expect(r.myShare).toBeCloseTo(66.68, 2); // payer carries the halala remainder
    expect(r.rows).toEqual([
      { contactId: "khalid", direction: "owes_me", amount: 66.66 },
      { contactId: "omar", direction: "owes_me", amount: 66.66 },
    ]);
    expect(r.myShare + r.rows.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(200, 6);
  });

  it("Omar paid a SAR 70 taxi for the two of us: I owe him my 35", () => {
    const r = splitWithOutside({ bill: 70, currency: "SAR", contactIds: ["omar"], payer: "omar" });
    expect(r.myShare).toBe(35);
    expect(r.rows).toEqual([{ contactId: "omar", direction: "i_owe", amount: 35 }]);
  });

  it("someone else paid for a group: only my debt to the payer is recorded", () => {
    const r = splitWithOutside({ bill: 90, currency: "SAR", contactIds: ["omar", "sara"], payer: "omar" });
    expect(r.myShare).toBe(30);
    expect(r.rows).toEqual([{ contactId: "omar", direction: "i_owe", amount: 30 }]);
  });

  it("no one else in it: the whole bill is mine", () => {
    expect(splitWithOutside({ bill: 50, currency: "SAR", contactIds: [], payer: ME })).toEqual({ myShare: 50, rows: [] });
  });

  it("the payer has to be in the split", () => {
    expect(() => splitWithOutside({ bill: 50, currency: "SAR", contactIds: ["a"], payer: "b" })).toThrow();
  });

  it("nets per person, ignoring settled rows", () => {
    const n = netByContact([
      { contactId: "khalid", direction: "owes_me", amount: 60, settled: false },
      { contactId: "khalid", direction: "i_owe", amount: 20, settled: false },
      { contactId: "khalid", direction: "owes_me", amount: 999, settled: true },
      { contactId: "omar", direction: "i_owe", amount: 35, settled: false },
    ]);
    expect(n.get("khalid")).toBe(40);
    expect(n.get("omar")).toBe(-35);
  });
});
