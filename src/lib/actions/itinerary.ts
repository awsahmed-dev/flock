"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { itineraryItems, profiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function createItineraryItem(formData: FormData) {
  const user = await getAuthenticatedUser();
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await db.insert(profiles).values({
    id: user.id,
    displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
    email: user.email,
  }).onConflictDoNothing();

  const costRaw = formData.get("costEstimate") as string;

  await db.insert(itineraryItems).values({
    tripId,
    dayDate: formData.get("dayDate") as string,
    title: formData.get("title") as string,
    type: (formData.get("type") as "activity" | "accommodation" | "transport" | "meal" | "other") || "activity",
    startTime: (formData.get("startTime") as string) || null,
    locationName: (formData.get("locationName") as string) || null,
    costEstimate: costRaw ? parseFloat(costRaw) : null,
    bookingUrl: (formData.get("bookingUrl") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: "proposed",
    sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
    createdBy: user.id,
  });

  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function updateItineraryItem(formData: FormData) {
  const user = await getAuthenticatedUser();
  const itemId = formData.get("itemId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  const costRaw = formData.get("costEstimate") as string;

  await db.update(itineraryItems)
    .set({
      title: formData.get("title") as string,
      type: (formData.get("type") as "activity" | "accommodation" | "transport" | "meal" | "other"),
      startTime: (formData.get("startTime") as string) || null,
      locationName: (formData.get("locationName") as string) || null,
      costEstimate: costRaw ? parseFloat(costRaw) : null,
      bookingUrl: (formData.get("bookingUrl") as string) || null,
      notes: (formData.get("notes") as string) || null,
      updatedAt: new Date(),
    })
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function updateItemStatus(
  itemId: string,
  tripId: string,
  status: "proposed" | "confirmed" | "rejected"
) {
  const user = await getAuthenticatedUser();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  await db.update(itineraryItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function deleteItineraryItem(itemId: string, tripId: string) {
  const user = await getAuthenticatedUser();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  await db.delete(itineraryItems)
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/itinerary`);
}

export async function updateItemSortOrders(
  updates: { id: string; sortOrder: number }[],
  tripId: string
) {
  const user = await getAuthenticatedUser();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  await Promise.all(
    updates.map((u) =>
      db.update(itineraryItems)
        .set({ sortOrder: u.sortOrder })
        .where(and(eq(itineraryItems.id, u.id), eq(itineraryItems.tripId, tripId)))
    )
  );

  revalidatePath(`/trips/${tripId}/itinerary`);
}
