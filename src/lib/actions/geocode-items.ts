"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function saveItemCoordinates(
  tripId: string,
  itemId: string,
  lat: number,
  lng: number
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  await db
    .update(itineraryItems)
    .set({ locationLat: lat, locationLng: lng })
    .where(and(eq(itineraryItems.id, itemId), eq(itineraryItems.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/itinerary`);
}
