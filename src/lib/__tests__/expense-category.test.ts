import { describe, it, expect } from "vitest";
import { inferCategory } from "@/lib/expense-category";

describe("inferCategory", () => {
  // Real titles from the owner's own trips. The first two are the bug: an
  // Arabic train came back "other", and flight tickets only worked because
  // "flight" had been typed in English as well.
  it.each([
    ["قطار لبازار سيني", "transport"],
    ["تذاكر طيران", "transport"],
    ["تذاكر طيران flight", "transport"],
    ["Zus coffee", "food"],
    ["Nasi lemak lunch", "food"],
  ])("real titles: %s → %s", (text, cat) => expect(inferCategory(text)).toBe(cat));

  it.each([
    ["عشاء في البيك", "food"],
    ["قهوة", "food"],
    ["بالتاكسي للفندق", "transport"], // clitics: ب+ال, and transport outranks the hotel it went to
    ["حجز فندق في جدة", "accommodation"],
    ["للفندق", "accommodation"],
    ["والمطعم", "food"],
    ["تذكرة المتحف", "activity"],
    ["هدايا للأهل", "shopping"],
    ["أوبر", "transport"],
    ["إيجار سيارة", "transport"],
    ["آيس كريم", "food"],
    ["مَطْعَم", "food"], // harakat
    // place words don't decide the category — the thing bought does
    ["عشاء في الفندق", "food"],
    ["فندق قرب المطار", "accommodation"],
  ])("Arabic: %s → %s", (text, cat) => expect(inferCategory(text)).toBe(cat));

  it.each([
    ["makan malam", "food"],
    ["teksi ke KLCC", "transport"],
  ])("Malay: %s → %s", (text, cat) => expect(inferCategory(text)).toBe(cat));

  it.each([
    ["غداً نلتقي"],   // "tomorrow" — must not read as lunch
    ["حلي ذهب"],       // jewellery — must not read as sweets
    ["مصاريف متفرقة"],  // genuinely uncategorised
    [""],
  ])("stays other: %s", (text) => expect(inferCategory(text)).not.toBe("food"));

  it.each([
    ["Taxi to hotel", "transport"],
    ["Dinner at the hotel", "food"],
    ["Hotel near the airport", "accommodation"],
  ])("English place words: %s → %s", (text, cat) => expect(inferCategory(text)).toBe(cat));

  it("English unchanged", () => {
    expect(inferCategory("burger")).toBe("food");
    expect(inferCategory("uber to the airport")).toBe("transport");
    expect(inferCategory("hammock")).toBe("other");
  });
});
