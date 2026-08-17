/**
 * Money correctness — regression tests for fix/money.
 *
 * These REPLACE the "document the bug" assertions from the audit. Each block
 * names the old behaviour and asserts the new one, so if anybody reintroduces
 * a bug the test name tells them exactly what they broke.
 */
import { describe, it, expect } from "vitest";
import { splitEqually, sharesMatchTotal, toMinorUnits, currencyExponent } from "@/lib/split";
import { totalInCurrency, totalInCurrencyBy, createBaseConverter } from "@/lib/money-total";
import { effectiveTripBudget } from "@/lib/budget";
import type { RateBundle } from "@/lib/fx";

const sum = (xs: { amountOwed: number }[], c = "USD") =>
  xs.reduce((a, s) => a + toMinorUnits(s.amountOwed, c), 0);

describe("M-1 FIXED — shares sum to the total, exactly, for every N", () => {
  const P = "payer";
  const crew = (n: number) => [P, ...Array.from({ length: n - 1 }, (_, i) => `u${i}`)];

  it("$100 / 7 no longer asks the crew for $100.03", () => {
    const shares = splitEqually(100, "USD", crew(7), P);
    expect(sum(shares)).toBe(10000); // exactly $100.00
    // 10000c / 7 = 1428c each with 4c left over. Non-payers pay $14.28 (the
    // old code rounded each to $14.29, which is where the extra 3c came from);
    // the payer absorbs the 4c and pays $14.32.
    expect(shares.find((s) => s.userId === P)!.amountOwed).toBe(14.32);
    expect(shares.filter((s) => s.userId !== P).every((s) => s.amountOwed === 14.28)).toBe(true);
  });

  it("$10 / 3 no longer loses a cent", () => {
    expect(sum(splitEqually(10, "USD", crew(3), P))).toBe(1000);
  });

  it("$0.01 / 2 — one cent, to one person, not two", () => {
    const shares = splitEqually(0.01, "USD", crew(2), P);
    expect(sum(shares)).toBe(1);
    expect(shares.map((s) => s.amountOwed).sort()).toEqual([0, 0.01]);
  });

  it("JPY is zero-decimal and is now split in whole yen", () => {
    expect(currencyExponent("JPY")).toBe(0);
    const shares = splitEqually(100, "JPY", crew(3), P);
    expect(shares.map((s) => s.amountOwed).sort()).toEqual([33, 33, 34]);
    expect(sum(shares, "JPY")).toBe(100);
  });

  it("KWD has three decimals and round-trips exactly", () => {
    expect(currencyExponent("KWD")).toBe(3);
    expect(sum(splitEqually(12.345, "KWD", crew(2), P), "KWD")).toBe(12345);
  });

  it("holds for every party count 2..12 across awkward amounts", () => {
    for (const amount of [0.03, 1, 9.99, 10, 100, 33.33, 1234.56]) {
      for (let n = 2; n <= 12; n++) {
        expect(sum(splitEqually(amount, "USD", crew(n), P))).toBe(toMinorUnits(amount, "USD"));
      }
    }
  });

  it("the remainder always lands on the payer, never against a debtor", () => {
    const shares = splitEqually(100, "USD", crew(7), P);
    const payer = shares.find((s) => s.userId === P)!.amountOwed;
    expect(shares.every((s) => s.userId === P || s.amountOwed <= payer)).toBe(true);
  });
});

describe("M-8 FIXED — the split-equally validator accepts its own output", () => {
  it("passes at $100/7 and $100/3, which both used to be rejected", () => {
    for (const [amount, n] of [[100, 7], [100, 3], [10, 3], [20, 3]] as const) {
      const ids = Array.from({ length: n }, (_, i) => `u${i}`);
      const shares = splitEqually(amount, "USD", ids, "u0");
      expect(sharesMatchTotal(shares.map((s) => s.amountOwed), amount, "USD")).toBe(true);
    }
  });
});

describe("M-2 FIXED — a missing rate is never turned into a number", () => {
  const rows = [
    { amount: 420, currency: "USD" },
    { amount: 100, currency: "USD" },
    { amount: 96000, currency: "KRW" },
  ];

  it("no rates: the KRW row is excluded and REPORTED — not counted as 0, not as 96,000", () => {
    const r = totalInCurrency(rows, "USD", null);
    expect(r.total).toBe(520); // the two USD rows only
    expect(r.complete).toBe(false); // the UI must not show 520 on its own
    expect(r.unconverted).toEqual([{ amount: 96000, currency: "KRW" }]);
  });

  it("with rates: everything converts and complete is true", () => {
    const rates = { base: "USD", rates: { KRW: 1380 }, fetchedAt: 0 } as unknown as RateBundle;
    const r = totalInCurrency(rows, "USD", rates);
    expect(r.complete).toBe(true);
    expect(r.unconverted).toHaveLength(0);
    expect(r.total).toBeCloseTo(520 + 96000 / 1380, 2);
  });

  it("per-payer totals follow the same rule", () => {
    const r = totalInCurrencyBy(
      [
        { amount: 50000, currency: "JPY", key: "a" },
        { amount: 20, currency: "USD", key: "b" },
      ],
      "USD",
      null,
    );
    expect(r.byKey.get("a")).toBeUndefined(); // not 50000, not 0 — absent
    expect(r.byKey.get("b")).toBe(20);
    expect(r.complete).toBe(false);
  });
});

describe("M-3 FIXED — one budget number, computed one way", () => {
  it("per-person budgets multiply by crew size", () => {
    expect(effectiveTripBudget(2000, "per_person", 4)).toBe(8000);
    expect(effectiveTripBudget(2000, "flat", 4)).toBe(2000);
  });

  it("the watcher's percentage is taken against the effective budget", () => {
    const spent = 1800;
    const effective = effectiveTripBudget(2000, "per_person", 4)!;
    expect(Math.round((spent / effective) * 100)).toBe(23); // was 90 against the raw column
  });
});

describe("createBaseConverter (client toBase replacement)", () => {
  const rates = { base: "USD", rates: { JPY: 150, EUR: 0.9 }, fetchedAt: 0 };

  it("passes base rows through and converts known currencies", () => {
    const { toBase, missing } = createBaseConverter("USD", rates);
    expect(toBase(100, "USD")).toBe(100);
    expect(toBase(15000, "JPY")).toBeCloseTo(100);
    expect([...missing]).toEqual([]);
  });

  it("records a missing rate instead of silently counting the row as zero — the 96,000 KRW dinner", () => {
    const { toBase, missing } = createBaseConverter("USD", rates);
    const total = toBase(20, "USD") + toBase(96000, "KRW");
    expect(total).toBe(20); // excluded from arithmetic…
    expect([...missing]).toEqual(["KRW"]); // …but never excluded silently
  });

  it("with no rate bundle at all, every foreign currency is reported once", () => {
    const { toBase, missing } = createBaseConverter("USD", null);
    toBase(1, "JPY"); toBase(2, "JPY"); toBase(3, "KRW");
    expect([...missing].sort()).toEqual(["JPY", "KRW"]);
  });
});
