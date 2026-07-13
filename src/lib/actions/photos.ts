"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { tripPhotos } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";

/**
 * Sprint 8 Item 6 (RECAP sheet): save a crew photo against a stop. The
 * browser uploads the file to the trip-documents bucket first (same
 * path convention as documents); this records the resulting URL.
 * Returns `{error}` instead of throwing — prod masks thrown errors.
 */
export async function addTripPhoto(input: {
  tripId: string;
  itemId: string | null;
  url: string;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) return { error: "Trip not found or access denied" };
  if (!input.url) return { error: "Missing photo URL" };

  await db.insert(tripPhotos).values({
    tripId: input.tripId,
    itemId: input.itemId,
    url: input.url,
    uploadedBy: user.id,
  });

  revalidatePath(`/trips/${input.tripId}/itinerary`);
  revalidatePath(`/trips/${input.tripId}/recap/photos`);
  return {};
}
