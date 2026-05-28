"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { itineraryItems, profiles, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { geocode } from "@/lib/geocode";
import { canManageItem, PermissionError } from "@/lib/permissions";

const TYPE_EMOJI: Record<string, string> = {
  activity: "✨", accommodation: "🏨", transport: "✈️", meal: "🍽️", other: "📍",
};

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
  const locationName = (formData.get("locationName") as string) || null;

  // Auto-geocode location name → coordinates (non-blocking, best effort)
  let lat: number | null = null;
  let lng: number | null = null;
  if (locationName) {
    const geo = await geocode(locationName, trip.destination).catch(() => null);
    if (geo) { lat = geo.lat; lng = geo.lng; }
  }

  const [newItem] = await db.insert(itineraryItems).values({
    tripId,
    dayDate: formData.get("dayDate") as string,
    title: formData.get("title") as string,
    type: (formData.get("type") as "activity" | "accommodation" | "transport" | "meal" | "other") || "activity",
    startTime: (formData.get("startTime") as string) || null,
    locationName,
    locationLat: lat,
    locationLng: lng,
    costEstimate: costRaw ? parseFloat(costRaw) : null,
    bookingUrl: (formData.get("bookingUrl") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: "proposed",
    sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
    createdBy: user.id,
  }).returning();

  // Auto-post to chat so the rest of the crew sees the new plan in their
  // shared timeline. Mirrors what the mobile app does on the same action.
  const itemType = (formData.get("type") as string) || "activity";
  const itemTitle = formData.get("title") as string;
  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    body: `${TYPE_EMOJI[itemType] ?? "✨"} New plan: ${itemTitle}`,
    type: "itinerary_card",
    metadata: {
      itineraryItemId: newItem.id,
      title: itemTitle,
      type: itemType,
      dayDate: formData.get("dayDate") as string,
      locationName,
    },
  }).catch(() => {});

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}`);
}

/**
 * B5: dedicated action for "Add a place by search" — takes a Foursquare
 * place blob (id + name + lat/lng + address + rich metadata) and writes
 * it straight to itinerary_items with no geocode roundtrip.
 *
 * The richer fields (photo, hours, rating, top tip) are best-effort and
 * NULL when the upstream Foursquare details call was thin.
 */
export async function createItineraryItemFromPlace(input: {
  tripId: string;
  dayDate: string;
  title: string;
  type?: "activity" | "accommodation" | "transport" | "meal" | "other";
  fsqId: string;
  fsqCategory?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  photoUrl?: string | null;
  rating?: number | null;
  priceLevel?: number | null;
  hoursSummary?: string | null;
  topTip?: string | null;
  costEstimate?: number | null;
}) {
  const user = await getAuthenticatedUser();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await db.insert(profiles).values({
    id: user.id,
    displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
    email: user.email,
  }).onConflictDoNothing();

  // Decide sort order — drop at the end of that day's stack so it doesn't
  // jump in front of existing items.
  const existingForDay = await db.query.itineraryItems.findMany({
    where: and(
      eq(itineraryItems.tripId, input.tripId),
      eq(itineraryItems.dayDate, input.dayDate),
    ),
    columns: { sortOrder: true },
  });
  const sortOrder = existingForDay.length;

  const [newItem] = await db.insert(itineraryItems).values({
    tripId: input.tripId,
    dayDate: input.dayDate,
    title: input.title,
    type: input.type ?? inferTypeFromCategory(input.fsqCategory),
    locationName: input.locationName ?? null,
    locationLat: input.locationLat ?? null,
    locationLng: input.locationLng ?? null,
    costEstimate: input.costEstimate ?? null,
    status: "proposed",
    sortOrder,
    createdBy: user.id,
    fsqId: input.fsqId,
    fsqCategory: input.fsqCategory ?? null,
    photoUrl: input.photoUrl ?? null,
    rating: input.rating ?? null,
    priceLevel: input.priceLevel ?? null,
    hoursSummary: input.hoursSummary ?? null,
    topTip: input.topTip ?? null,
  }).returning();

  const itemType = newItem.type ?? "activity";
  await db.insert(chatMessages).values({
    tripId: input.tripId,
    userId: user.id,
    body: `${TYPE_EMOJI[itemType] ?? "📍"} New plan: ${input.title}`,
    type: "itinerary_card",
    metadata: {
      itineraryItemId: newItem.id,
      title: input.title,
      type: itemType,
      dayDate: input.dayDate,
      locationName: input.locationName ?? null,
      photoUrl: input.photoUrl ?? null,
    },
  }).catch(() => {});

  revalidatePath(`/trips/${input.tripId}/itinerary`);
  revalidatePath(`/trips/${input.tripId}`);
  return newItem;
}

/** Foursquare category text → our itinerary type enum. Best-effort. */
function inferTypeFromCategory(category: string | null | undefined): "activity" | "accommodation" | "transport" | "meal" | "other" {
  if (!category) return "activity";
  const c = category.toLowerCase();
  if (/(hotel|hostel|inn|resort|lodge|bnb|motel|villa)/.test(c)) return "accommodation";
  if (/(restaurant|cafe|coffee|bar|pub|food|bakery|brewery|ice cream)/.test(c)) return "meal";
  if (/(airport|train|station|subway|metro|bus|ferry|car|taxi)/.test(c)) return "transport";
  return "activity";
}

export async function updateItineraryItem(formData: FormData) {
  const user = await getAuthenticatedUser();
  const itemId = formData.get("itemId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  // B2-3: only the item's creator or a trip owner may edit it. Group
  // decisions (status / sort) stay open to all members — see updateItemStatus.
  const existing = await db.query.itineraryItems.findFirst({
    where: and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)),
    columns: { createdBy: true },
  });
  if (!existing) throw new Error("Item not found");
  if (!canManageItem(existing, trip, user.id)) {
    throw new PermissionError("Only the person who added this item or the trip owner can edit it");
  }

  const costRaw = formData.get("costEstimate") as string;
  const locationName = (formData.get("locationName") as string) || null;

  // Re-geocode if location name changed
  let lat: number | null | undefined = undefined;
  let lng: number | null | undefined = undefined;
  if (locationName) {
    const geo = await geocode(locationName, trip.destination).catch(() => null);
    lat = geo?.lat ?? null;
    lng = geo?.lng ?? null;
  } else {
    lat = null; lng = null; // cleared location
  }

  await db.update(itineraryItems)
    .set({
      title: formData.get("title") as string,
      type: (formData.get("type") as "activity" | "accommodation" | "transport" | "meal" | "other"),
      startTime: (formData.get("startTime") as string) || null,
      locationName,
      locationLat: lat,
      locationLng: lng,
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

  // B2-3: creator-or-owner gate. Mirrors the edit gate.
  const existing = await db.query.itineraryItems.findFirst({
    where: and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)),
    columns: { createdBy: true },
  });
  if (!existing) throw new Error("Item not found");
  if (!canManageItem(existing, trip, user.id)) {
    throw new PermissionError("Only the person who added this item or the trip owner can delete it");
  }

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
