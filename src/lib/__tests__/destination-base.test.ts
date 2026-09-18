import { describe, it, expect } from "vitest";
import {
  baseForDestination,
  basesForDestination,
  countryOfDestination,
  curatedBasesInCountry,
  customBaseId,
  isCountryOnly,
} from "@/lib/packages/destination-base";

/**
 * The rule that gave 42 pre-existing trips a shape. Every case here is a
 * real destination string from the production database.
 */
describe("which city a destination means", () => {
  const id = (s: string) => baseForDestination(s).base?.id ?? customBaseId(baseForDestination(s).customName);

  it("takes the city the user typed, not the country after the comma", () => {
    // The one that matters: matching the whole string sent a Kuching trip
    // to Kuala Lumpur, a different island 1,600km away.
    expect(id("Kuching, Sarawak, Malaysia")).toBe("custom:kuching");
    expect(id("Penang, Langkawi")).toBe("custom:penang");
  });

  it("resolves a plain city", () => {
    expect(id("Tokyo, Japan")).toBe("tokyo");
    expect(id("Kyoto, Japan")).toBe("kyoto");
    expect(id("Lisbon, Portugal")).toBe("lisbon");
    expect(id("Cairo, Egypt")).toBe("cairo");
    expect(id("London, Uk")).toBe("london");
    expect(id("Langkawi")).toBe("langkawi");
    expect(id("Phuket")).toBe("phuket");
  });

  it("resolves a country through its route", () => {
    expect(baseForDestination("Japan").how).toBe("route");
    expect(id("Japan")).toBe("tokyo");
  });

  it("reads Arabic destinations", () => {
    expect(id("ماليزيا")).toBe("kuala_lumpur");
  });

  it("survives an airport, and keeps the city", () => {
    expect(id("Tbilisi International Airport, تبلّيسي، جورجيا")).toBe("tbilisi");
  });

  it("keeps a city we do not curate rather than guessing a near one", () => {
    expect(id("Barcelona ")).toBe("custom:barcelona");
    expect(id("Taiz, Yemen")).toBe("custom:taiz");
    expect(id("الخرطوم")).toBe("custom:الخرطوم");
  });

  it("does not fall over on nonsense or nothing", () => {
    // Both are real rows in production.
    expect(id("Potato")).toBe("custom:potato");
    expect(id("Ygg")).toBe("custom:ygg");
    expect(baseForDestination("").base).toBeNull();
    expect(baseForDestination("   ").customName).toBe("");
  });
});

describe("splitting a multi-city destination", () => {
  const ids = (s: string) =>
    basesForDestination(s).map((m) => m.base?.id ?? customBaseId(m.customName));

  it("splits a real list of cities", () => {
    expect(ids("Kuala Lumpur, Langkawi, Penang")).toEqual([
      "kuala_lumpur",
      "langkawi",
      "custom:penang",
    ]);
    expect(ids("Langkawi, Penang, Kuala Lumpur")).toEqual([
      "langkawi",
      "custom:penang",
      "kuala_lumpur",
    ]);
    // One city we know is enough to prove the rest are cities too.
    expect(ids("Penang, Langkawi")).toEqual(["custom:penang", "langkawi"]);
  });

  it("keeps the order the traveller wrote them in", () => {
    expect(ids("Kyoto, Tokyo")).toEqual(["kyoto", "tokyo"]);
    expect(ids("Tokyo, Kyoto")).toEqual(["tokyo", "kyoto"]);
  });

  it("does NOT split a city and its country", () => {
    // The failure that would matter most: every autocompleted destination
    // in the database looks like this.
    expect(ids("Kuala Lumpur, Malaysia")).toEqual(["kuala_lumpur"]);
    expect(ids("Tokyo, Japan")).toEqual(["tokyo"]);
    expect(ids("Cairo, Egypt")).toEqual(["cairo"]);
    expect(ids("Lisbon, Portugal")).toEqual(["lisbon"]);
  });

  it("does NOT invent a stay out of a region or an airport suffix", () => {
    expect(ids("Kuching, Sarawak, Malaysia")).toEqual(["custom:kuching"]);
    expect(ids("Tbilisi International Airport, تبلّيسي، جورجيا")).toEqual(["tbilisi"]);
  });

  it("drops a city repeated in the same list", () => {
    expect(ids("Tokyo, Kyoto, Tokyo")).toEqual(["tokyo", "kyoto"]);
  });

  it("handles a single city, and nothing at all", () => {
    expect(ids("Langkawi")).toEqual(["langkawi"]);
    expect(ids("")).toEqual([]);
  });
});

describe("Arabic spelling variants resolve to the same city", () => {
  // Arabic is written with optional diacritics and interchangeable letter
  // forms. A user typing the same city a different-but-correct way used to
  // land on an invented custom base.
  it("ignores diacritics", () => {
    expect(baseForDestination("تبلّيسي").base?.id).toBe("tbilisi");
    expect(baseForDestination("تبليسي").base?.id).toBe("tbilisi");
  });

  it("folds alef and ya variants", () => {
    expect(baseForDestination("الامارات").base?.id).toBeTruthy();
    expect(baseForDestination("الإمارات").base?.id).toBeTruthy();
    expect(baseForDestination("الإمارات").base?.id).toBe(
      baseForDestination("الامارات").base?.id,
    );
  });
});

describe("the country a destination names", () => {
  it("reads a country in either language", () => {
    expect(countryOfDestination("السعودية")).toBe("SA");
    expect(countryOfDestination("Saudi Arabia")).toBe("SA");
    expect(countryOfDestination("اليابان")).toBe("JP");
    expect(countryOfDestination("Kuching, Sarawak, Malaysia")).toBe("MY");
  });

  it("offers the cities we curate there", () => {
    // The Saudi trip: a country is not a city, but the screen can still
    // say which cities in it we know about.
    const sa = curatedBasesInCountry("السعودية").map((b) => b.id);
    expect(sa.length).toBeGreaterThan(0);
    expect(sa).toContain("alula");
  });

  it("says nothing for a country we do not cover", () => {
    expect(countryOfDestination("Taiz, Yemen")).toBeNull();
    expect(curatedBasesInCountry("Potato")).toEqual([]);
  });
});

describe("a country is not a city", () => {
  it("spots a bare country, in both languages", () => {
    expect(isCountryOnly("السعودية")).toBe(true);
    expect(isCountryOnly("Spain")).toBe(true);
    expect(isCountryOnly("Yemen")).toBe(true);
    expect(isCountryOnly("اليمن")).toBe(true);
  });

  it("leaves a city alone, even one we do not curate", () => {
    // The head is where you sleep. Taiz is a city; Yemen after the comma
    // does not make the trip a country trip.
    expect(isCountryOnly("Taiz, Yemen")).toBe(false);
    expect(isCountryOnly("الخرطوم")).toBe(false);
    expect(isCountryOnly("Kuching, Sarawak, Malaysia")).toBe(false);
    expect(isCountryOnly("Kuala Lumpur, Malaysia")).toBe(false);
    expect(isCountryOnly("Tokyo, Japan")).toBe(false);
  });

  it("does not trip over nonsense or nothing", () => {
    expect(isCountryOnly("Potato")).toBe(false);
    expect(isCountryOnly("")).toBe(false);
  });
});
