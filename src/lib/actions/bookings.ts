"use server";

import { db } from "@/lib/db";
import { itineraryItems, bookings, activities } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { revalidatePath } from "next/cache";

/**
 * Phase 6 §6-C: create a booking — one anchor stop (pinned, undeletable,
 * unvotable) + a bookings row. It appears at the top of its day and in
 * the Departure Board automatically.
 */
export async function addBooking(input: {
  tripId: string;
  type: "flight" | "stay" | "other";
  name: string; // flight number or booking name
  providerName?: string | null;
  dayDate: string;
  time?: string | null; // check-in for stays, departure for flights (HH:mm)
  confirmationNumber?: string | null;
  nights?: number | null;
  pdfUrl?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  if (!input.name.trim() || !input.dayDate) throw new Error("A booking needs a name and a date");

  const stopType =
    input.type === "flight" ? "booking_flight" : input.type === "stay" ? "booking_stay" : "booking_other";
  const itemType = input.type === "flight" ? "transport" : input.type === "stay" ? "accommodation" : "other";

  const [stop] = await db
    .insert(itineraryItems)
    .values({
      tripId: input.tripId,
      dayDate: input.dayDate,
      title: input.providerName?.trim() ? `${input.providerName.trim()} — ${input.name.trim()}` : input.name.trim(),
      type: itemType,
      startTime: input.time || null,
      status: "confirmed",
      stopType,
      sortOrder: -1, // anchors pin above regular stops regardless, but keep them early
      createdBy: user.id,
      provider: "manual",
    })
    .returning({ id: itineraryItems.id });

  await db.insert(bookings).values({
    stopId: stop.id,
    bookingType: input.type,
    providerName: input.providerName ?? null,
    confirmationNumber: input.confirmationNumber ?? null,
    nights: input.nights ?? null,
    pdfUrl: input.pdfUrl ?? null,
    createdBy: user.id,
  });

  await db
    .insert(activities)
    .values({
      tripId: input.tripId,
      actorId: user.id,
      eventType: "stop_added",
      stopId: stop.id,
      placeName: input.name.trim(),
      metadata: { booking: true, type: input.type, day: input.dayDate },
    })
    .catch(() => {});

  revalidatePath(`/trips/${input.tripId}`);
  revalidatePath(`/trips/${input.tripId}/itinerary`);
  return { stopId: stop.id };
}

/** §6-B: booking edit — trip owner only. */
export async function updateBooking(input: {
  tripId: string;
  stopId: string;
  confirmationNumber?: string | null;
  time?: string | null;
  pdfUrl?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) throw new Error("Only the trip owner can edit bookings");

  if (input.time !== undefined) {
    await db
      .update(itineraryItems)
      .set({ startTime: input.time, updatedAt: new Date() })
      .where(and(eq(itineraryItems.id, input.stopId), eq(itineraryItems.tripId, input.tripId)));
  }
  await db
    .update(bookings)
    .set({
      ...(input.confirmationNumber !== undefined ? { confirmationNumber: input.confirmationNumber } : {}),
      ...(input.pdfUrl !== undefined ? { pdfUrl: input.pdfUrl } : {}),
    })
    .where(eq(bookings.stopId, input.stopId));

  revalidatePath(`/trips/${input.tripId}/itinerary`);
  revalidatePath(`/trips/${input.tripId}`);
}
