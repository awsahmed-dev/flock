import { describe, it, expect } from "vitest";
import { baseForDestination, customBaseId } from "@/lib/packages/destination-base";

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
