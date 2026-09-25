import { describe, it, expect } from "vitest";
import { staysOf, defaultRooms, stayRef, bookingSearchUrl, outboundUrl } from "@/lib/stays";

// The owner's real Saudi route: Jeddah → Riyadh → Jeddah, flying home 6 Nov.
const SAUDI = [
  { baseId: "custom:جدة", checkIn: "2026-10-06", checkOut: "2026-10-11", name: "Jeddah", nameAr: "جدة" },
  { baseId: "custom:الرياض", checkIn: "2026-10-11", checkOut: "2026-11-05", name: "Riyadh", nameAr: "الرياض" },
  { baseId: "custom:جدة", checkIn: "2026-11-05", checkOut: "2026-11-06", name: "Jeddah", nameAr: "جدة" },
];

describe("staysOf", () => {
  it("one stay per visit, the second Jeddah its own stay with its own key", () => {
    const s = staysOf(SAUDI, []);
    expect(s.map((x) => [x.key, x.nights])).toEqual([
      ["custom:جدة", 5],
      ["custom:الرياض", 25],
      ["custom:جدة#2", 1],
    ]);
    expect(s.every((x) => x.coveredBy === null && x.coveredNights === 0)).toBe(true);
  });

  it("a booked stay anchor covers its nights, and only those", () => {
    const s = staysOf(SAUDI, [{ dayDate: "2026-10-06", nights: 5, title: "Rosewood Jeddah" }]);
    expect(s[0].coveredBy).toBe("Rosewood Jeddah");
    expect(s[0].coveredNights).toBe(5);
    expect(s[1].coveredBy).toBeNull();
    expect(s[2].coveredBy).toBeNull(); // same city, different visit
  });

  it("partly covered is not covered — and says how much", () => {
    const s = staysOf(SAUDI, [{ dayDate: "2026-10-06", nights: 3, title: "Short hotel" }]);
    expect(s[0].coveredBy).toBeNull();
    expect(s[0].coveredNights).toBe(3);
  });

  it("plain accommodation stops cover one night each", () => {
    const s = staysOf(SAUDI, [{ dayDate: "2026-11-05", nights: null, title: "Airport hotel" }]);
    expect(s[2].coveredBy).toBe("Airport hotel");
  });

  it("a visit with no night in it gets no card", () => {
    const s = staysOf([...SAUDI, { baseId: "x", checkIn: "2026-11-06", checkOut: "2026-11-06", name: "X", nameAr: "X" }], []);
    expect(s).toHaveLength(3);
  });

  it("the check-out night isn't slept there", () => {
    // A hotel on the check-out day belongs to the next stay, not this one.
    const s = staysOf(SAUDI, [{ dayDate: "2026-10-11", nights: 1, title: "Riyadh night 1" }]);
    expect(s[0].coveredNights).toBe(0);
    expect(s[1].coveredNights).toBe(1);
  });
});

describe("rooms, reference, link", () => {
  it("two to a room, at least one", () => {
    expect([1, 2, 3, 4, 5, 6].map(defaultRooms)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(defaultRooms(0)).toBe(1);
  });

  it("the reference carries no personal data and fits the field", () => {
    const r = stayRef("stays_card", "bc506179-352a-4bea-831b-6c50560f9d89");
    expect(r).toBe("sawia-stays_card-bc506179");
    expect(r.length).toBeLessThanOrEqual(64);
  });

  it("the search is filled in from the stay", () => {
    const u = new URL(bookingSearchUrl({ city: "Jeddah", checkIn: "2026-10-06", checkOut: "2026-10-11", adults: 1, rooms: 1, currency: "SAR", lang: "ar" }));
    expect(u.hostname).toBe("www.booking.com");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      ss: "Jeddah", checkin: "2026-10-06", checkout: "2026-10-11", group_adults: "1", no_rooms: "1", selected_currency: "SAR", lang: "ar",
    });
    expect(u.searchParams.has("aid")).toBe(false);
  });

  const search = "https://www.booking.com/searchresults.html?ss=Jeddah&checkin=2026-10-06";
  it("off goes nowhere; preview goes straight to the search", () => {
    expect(outboundUrl({ mode: "off", searchUrl: search, sid: "s" })).toBeNull();
    expect(outboundUrl({ mode: "preview", searchUrl: search, sid: "s" })).toBe(search);
  });

  it("live wraps the search in the network template", () => {
    const out = outboundUrl({
      mode: "live",
      searchUrl: search,
      sid: "sawia-stays_card-bc506179",
      template: "https://www.anrdoezrs.net/click-111-222?sid={sid}&url={url}",
    })!;
    const u = new URL(out);
    expect(u.searchParams.get("sid")).toBe("sawia-stays_card-bc506179");
    expect(u.searchParams.get("url")).toBe(search);
  });

  it("live without a template refuses rather than sending an untracked click", () => {
    expect(outboundUrl({ mode: "live", searchUrl: search, sid: "s", template: null })).toBeNull();
    expect(outboundUrl({ mode: "live", searchUrl: search, sid: "s", template: "https://x/no-placeholder" })).toBeNull();
  });
});
