"use server";

import { db } from "@/lib/db";
import { tripWishlist, tripMembers, savedPlaces } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
 * Planning v2: the heart in Discover is the SAME gesture as the save button,
 * so it has to land in `saved_places` too. It didn't — hearts went only to
 * `trip_wishlist`, which meant a place you saved in Discover never reached
 * the trip's saves tray, never got layered into «الباقة», and never showed
 * up in «وش الحين؟». The one-time backfill in the planning-v2 migration hid
 * this for old rows and not at all for new ones.
 *
 * Both tables are written until the wishlist sheet is retired; `saved_places`
 * is the one the planner reads.
 */
async function mirrorToSaves(
  tripId: string,
  userId: string,
  place: WishlistPlace,
  on: boolean,
) {
  const existing = await db.query.savedPlaces.findFirst({
    where: and(
      eq(savedPlaces.userId, userId),
      eq(savedPlaces.tripId, tripId),
      eq(savedPlaces.placeId, place.placeId),
    ),
  });
  if (!on) {
    // Never delete a save that already graduated into the itinerary — the
    // stop would stay and its provenance would vanish.
    if (existing && existing.status !== "planned") {
      await db.delete(savedPlaces).where(eq(savedPlaces.id, existing.id));
    }
    return;
  }
  if (existing) return;
  await db.insert(savedPlaces).values({
    userId,
    tripId,
    placeId: place.placeId,
    placeName: place.placeName,
    photoRef: place.photoRef ?? null,
    category: place.category ?? null,
    rating: place.rating ?? null,
    address: place.address ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    source: "discover",
  });
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
    await mirrorToSaves(tripId, user.id, place, false);
    revalidatePath(`/trips/${tripId}/discover`);
    revalidatePath(`/trips/${tripId}/itinerary`);
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
  await mirrorToSaves(tripId, user.id, place, true);
  revalidatePath(`/trips/${tripId}/discover`);
  revalidatePath(`/trips/${tripId}/itinerary`);
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
  await db
    .delete(savedPlaces)
    .where(
      and(
        eq(savedPlaces.tripId, tripId),
        eq(savedPlaces.userId, user.id),
        eq(savedPlaces.placeId, placeId),
        isNull(savedPlaces.itemId),
      ),
    );
  revalidatePath(`/trips/${tripId}/discover`);
  revalidatePath(`/trips/${tripId}/itinerary`);
}
