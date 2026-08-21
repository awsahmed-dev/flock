import { describe, it, expect } from "vitest";
import { buildDeck, type DeckInput } from "@/lib/deck";
import { tripMoment } from "@/lib/trip-moment";

const trip = { startDate: "2026-10-06", endDate: "2026-10-12" };
const base: DeckInput = {
  moment: tripMoment(trip, "2026-08-18"), base: "/trips/x", destinationCity: "Tokyo", startDate: trip.startDate, heroImageUrl: "/hero.jpg",
  crewCount: 4, primaryKey: "votes",
  hearts: [], day1: { count: 0, firstTime: null, firstTitle: null }, weather: null, fx: null,
  money: { currency: "USD", budget: 8000, perPerson: 2000, spent: 0 }, docsCount: 0, ticker: null,
};

describe("buildDeck — one photo, then notes, capped", () => {
  it("the inspire door shows only while the plan AND shortlist are thin", () => {
    expect(buildDeck(base).notes.some((n) => n.kind === "inspire")).toBe(true);
    expect(buildDeck({ ...base, hearts: [
      { placeId: "p1", name: "A", photoUrl: null, hearts: 1, onPlan: true },
      { placeId: "p2", name: "B", photoUrl: null, hearts: 1, onPlan: true },
    ] }).notes.some((n) => n.kind === "inspire")).toBe(false);
    expect(buildDeck({ ...base, day1: { count: 3, firstTime: "10:00", firstTitle: "Shibuya" } }).notes.some((n) => n.kind === "inspire")).toBe(false);
  });
  it("a hearted place not on the plan is the hero; day 1 only with its own stop photo", () => {
    const d = buildDeck({ ...base, hearts: [{ placeId: "p1", name: "TeamLab", photoUrl: "/p1.jpg", hearts: 2, onPlan: false }], day1: { count: 3, firstTime: "10:00", firstTitle: "Shibuya" } });
    expect(d.hero?.kind).toBe("crewHeart");
    expect(d.notes.map((n) => n.kind)).toEqual(["day1", "money"]);
    // day 1 earns a hero only with a stop's OWN photo — never the trip photo (that's already the page hero)
    expect(buildDeck({ ...base, day1: { count: 3, firstTime: "10:00", firstTitle: "Shibuya" } }).hero).toBeNull();
    const d2 = buildDeck({ ...base, day1: { count: 3, firstTime: "10:00", firstTitle: "Shibuya", photoUrl: "/shibuya.jpg" } });
    expect(d2.hero?.kind).toBe("day1");
  });
  it("no photo → no hero, all notes; never more than three", () => {
    const d = buildDeck({ ...base, heroImageUrl: null, weather: { tempMax: 27, tempMin: 20, key: "cockpit.weatherClear", sunset: "18:03", isTripDay: false }, fx: { local: "JPY", symbol: "¥", perUnit: 156, base: "USD" }, ticker: { text: "Rania hearted TeamLab" } });
    expect(d.hero).toBeNull();
    expect(d.notes.length).toBe(3);
    expect(d.notes.map((n) => n.kind)).toEqual(["inspire", "crewPulse", "weather"]); // empty-ish trip: the camera-roll door outranks; fx+money fall off
  });
  it("docs note appears only once docs are due; invite only when the ticket isn't already the invite", () => {
    expect(buildDeck(base).notes.some((n) => n.kind === "docs")).toBe(false);
    const t3 = { ...base, moment: tripMoment(trip, "2026-10-03") };
    expect(buildDeck(t3).notes.some((n) => n.kind === "docs")).toBe(true);
    expect(buildDeck({ ...base, crewCount: 1 }).notes.some((n) => n.kind === "invite")).toBe(true);
    expect(buildDeck({ ...base, crewCount: 1, primaryKey: "crew" }).notes.some((n) => n.kind === "invite")).toBe(false);
  });
  it("money is formatted and per-person only with a crew", () => {
    const d = buildDeck(base);
    const money = d.notes.find((n) => n.kind === "money")!;
    expect(money.titleKey).toBe("cockpit.deck.moneyTitleEach");
    expect(money.params).toMatchObject({ budget: "8,000", each: "2,000" });
  });
});
