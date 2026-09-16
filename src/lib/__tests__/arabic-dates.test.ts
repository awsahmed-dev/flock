/**
 * Arabic date shape. A native reader called the old output "not words":
 * «أربعاء, سبتمبر 30» — no definite article, month before day, Latin comma.
 * date-fns's `ar` locale translates the words but keeps the pattern's
 * English shape, so the fix lives in our wrapper.
 */
import { describe, it, expect, afterEach } from "vitest";
import { format, setActiveLocale } from "@/lib/i18n/date-fns";

const d = new Date(2026, 8, 30); // Wed 30 Sep 2026
afterEach(() => setActiveLocale("en"));

describe("Arabic dates", () => {
  it("uses the definite article on weekdays", () => {
    setActiveLocale("ar");
    expect(format(d, "EEE")).toBe("الأربعاء");
    expect(format(d, "EEEE")).toBe("الأربعاء");
  });

  it("puts the day before the month", () => {
    setActiveLocale("ar");
    expect(format(d, "MMM d")).toBe("30 سبتمبر");
    expect(format(d, "MMMM d")).toBe("30 سبتمبر");
  });

  it("uses the Arabic comma, and none before a year", () => {
    setActiveLocale("ar");
    expect(format(d, "EEE, MMM d")).toBe("الأربعاء، 30 سبتمبر");
    expect(format(d, "MMMM d, yyyy")).toBe("30 سبتمبر 2026");
  });

  it("leaves English untouched", () => {
    setActiveLocale("en");
    expect(format(d, "EEE, MMM d")).toBe("Wed, Sep 30");
    expect(format(d, "MMMM d, yyyy")).toBe("September 30, 2026");
  });
});
