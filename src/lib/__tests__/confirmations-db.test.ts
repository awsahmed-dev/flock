/**
 * DB-backed: addConfirmations writes anchor stops + bookings + one document.
 * Same preconditions as authz.test.ts. Runs via `npm run test:db`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { profiles, trips, tripMembers, itineraryItems, bookings, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const missing = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].filter((k) => !process.env[k]);
if (missing.length) throw new Error(`confirmations-db: missing ${missing.join(", ")}`);

const ME = "00000000-0000-0000-0000-000000000001";
const TRIP = "00000000-0000-0000-0000-0000000000f7";

describe("addConfirmations", () => {
  beforeAll(async () => {
    await db.insert(profiles).values({ id: ME, displayName: "Dev", email: "dev@flock.local" }).onConflictDoNothing();
    await db.insert(trips).values({ id: TRIP, name: "Tokyo", destination: "Tokyo", startDate: "2026-10-06", endDate: "2026-10-12", createdBy: ME }).onConflictDoNothing();
    await db.delete(tripMembers).where(eq(tripMembers.tripId, TRIP));
    await db.insert(tripMembers).values({ tripId: TRIP, userId: ME, displayName: "Dev", role: "owner" });
  });

  it("flight + hotel → two anchor stops, two bookings, one doc; out-of-window date is clamped for the pin", async () => {
    const { addConfirmations } = await import("@/lib/actions/confirmations");
    const r = await addConfirmations({
      tripId: TRIP,
      fileUrl: "/api/storage/trip-documents/x/y/conf.png",
      items: [
        { kind: "flight", title: "SV 826", provider: "Saudia", confirmation: "7XK9QP", date: "2026-10-05", time: "23:55", endDate: null, endTime: null, from: "RUH", to: "NRT", address: null, notes: null, confidence: 0.9 },
        { kind: "hotel", title: "Shinjuku Granbell", provider: null, confirmation: "HB-22910", date: "2026-10-06", time: "15:00", endDate: "2026-10-12", endTime: "11:00", from: null, to: null, address: "Kabukicho", notes: "2 rooms", confidence: 0.85 },
      ],
    });
    expect(r.saved).toBe(2);
    const stops = await db.select().from(itineraryItems).where(eq(itineraryItems.tripId, TRIP));
    expect(stops.map((s) => s.stopType).sort()).toEqual(["booking_flight", "booking_stay"]);
    const flight = stops.find((s) => s.stopType === "booking_flight")!;
    expect(flight.dayDate).toBe("2026-10-06"); // clamped into the trip window
    expect(flight.title).toContain("SV 826");
    const bk = await db.select().from(bookings);
    expect(bk.filter((b) => r.stopIds.includes(b.stopId!)).length).toBe(2);
    expect(bk.find((b) => b.bookingType === "stay")?.nights).toBe(6);
    const docs = await db.select().from(documents).where(eq(documents.tripId, TRIP));
    expect(docs.length).toBe(1);
    expect(docs[0].type).toBe("flight");
  });
});
