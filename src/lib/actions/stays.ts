"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, itineraryItems, stayBookings } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { loadTripStays } from "@/lib/stays-server";
import { getTripWithMembership } from "./trips";
import type { Refused } from "./refusal";

/**
 * Stays — what happens when someone comes back from Booking.com.
 *
 * Booking.com never tells Sawia what was booked, so the app asks once. "Yes"
 * puts the hotel on the plan as a stay anchor covering exactly those nights
 * — and because coverage is READ from the plan, the card, the NOW ticket and
 * the Horizon all turn to "covered" for the whole crew without any of them
 * being told separately. "Not yet" just stops asking.
 */

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function markStayBooked(input: {
  tripId: string;
  stayKey: string;
  checkIn: string;
  hotelName: string;
}): Promise<{ ok: true } | Refused> {
  const user = await me();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const hotel = input.hotelName.replace(/\s+/g, " ").trim().slice(0, 140);
  if (!hotel) return { ok: false, error: "stays.errHotelName" };

  const { stays } = await loadTripStays(input.tripId, user.id);
  const stay = stays.find((s) => s.key === input.stayKey && s.checkIn === input.checkIn);
  if (!stay) return { ok: false, error: "stays.errStayGone" };
  if (stay.coveredBy) return { ok: true }; // someone got there first — nothing to add

  // The hotel goes on the plan the same way a typed-in booking does: an
  // anchor stop on the check-in day, with the nights on its bookings row.
  const [stop] = await db
    .insert(itineraryItems)
    .values({
      tripId: input.tripId,
      dayDate: stay.checkIn,
      title: hotel,
      type: "accommodation",
      status: "confirmed",
      stopType: "booking_stay",
      sortOrder: -1,
      createdBy: user.id,
      provider: "manual",
      locationName: stay.name,
    })
    .returning({ id: itineraryItems.id });
  await db.insert(bookings).values({
    stopId: stop.id,
    bookingType: "stay",
    providerName: "Booking.com",
    nights: stay.nights,
    createdBy: user.id,
  });

  await db
    .insert(stayBookings)
    .values({ tripId: input.tripId, stayKey: stay.key, checkIn: stay.checkIn, userId: user.id, status: "booked", hotelName: hotel })
    .onConflictDoUpdate({
      target: [stayBookings.tripId, stayBookings.stayKey, stayBookings.checkIn, stayBookings.userId],
      set: { status: "booked", hotelName: hotel, updatedAt: new Date() },
    });

  revalidate(input.tripId);
  return { ok: true };
}

/** "Not yet": stop asking. The crew still sees that you're looking. */
export async function dismissStayPrompt(input: {
  tripId: string;
  stayKey: string;
  checkIn: string;
}): Promise<{ ok: true }> {
  const user = await me();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  await db
    .update(stayBookings)
    .set({ promptDismissedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(stayBookings.tripId, input.tripId),
        eq(stayBookings.stayKey, input.stayKey),
        eq(stayBookings.checkIn, input.checkIn),
        eq(stayBookings.userId, user.id),
      ),
    );
  revalidate(input.tripId);
  return { ok: true };
}

function revalidate(tripId: string) {
  revalidatePath(`/trips/${tripId}/stays`);
  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}`);
}
