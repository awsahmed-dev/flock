"use server";

import { db } from "@/lib/db";
import { tripWishlist, tripMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { revalidatePath } from "next/cache";

export interface WishlistPlace {
  placeId: string;
  placeName: string;
  photoRef?: string | null;
  category?: string | null;
  rating?: number | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

async function requireMember(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member) throw new Error("Not a trip member");
  return user;
}

/**
 * §3-A: toggle a place in the current user's wishlist for this trip. Returns
 * the resulting saved state so the client can reconcile its optimistic update.
 */
export async function toggleWishlist(
  tripId: string,
  place: WishlistPlace,
): Promise<{ saved: boolean }> {
  const user = await requireMember(tripId);
  const existing = await db.query.tripWishlist.findFirst({
    where: and(
      eq(tripWishlist.tripId, tripId),
      eq(tripWishlist.userId, user.id),
      eq(tripWishlist.placeId, place.placeId),
    ),
  });
  if (existing) {
    await db.delete(tripWishlist).where(eq(tripWishlist.id, existing.id));
    revalidatePath(`/trips/${tripId}/discover`);
    return { saved: false };
  }
  await db
    .insert(tripWishlist)
    .values({
      tripId,
      userId: user.id,
      placeId: place.placeId,
      placeName: place.placeName,
      photoRef: place.photoRef ?? null,
      category: place.category ?? null,
      rating: place.rating ?? null,
      address: place.address ?? null,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    })
    .onConflictDoNothing();
  revalidatePath(`/trips/${tripId}/discover`);
  return { saved: true };
}

/** Remove a saved place (from the wishlist sheet trash button). */
export async function removeWishlist(tripId: string, placeId: string): Promise<void> {
  const user = await requireMember(tripId);
  await db
    .delete(tripWishlist)
    .where(
      and(
        eq(tripWishlist.tripId, tripId),
        eq(tripWishlist.userId, user.id),
        eq(tripWishlist.placeId, placeId),
      ),
    );
  revalidatePath(`/trips/${tripId}/discover`);
}
