"use server";

import { db } from "@/lib/db";
import { placeLikes, huddleDecisions, cachedPlaces, tripMembers } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { logActivity } from "@/lib/actions/huddle";

/**
 * §1-E: toggle the current user's like on a discover place (scoped to the trip).
 * Returns the resulting liked state so the client can reconcile its optimistic
 * update.
 *
 * Phase 6 §4-A: a heart is a group signal, not a private note —
 *   · every like writes a place_hearted Pulse line,
 *   · the first like opens a CrewSuggestion card in the Decision Deck,
 *   · a second distinct member's like fires the 🔥 Crew Match moment.
 */
export async function togglePlaceLike(
  tripId: string,
  placeId: string,
): Promise<{ liked: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const where = and(
    eq(placeLikes.tripId, tripId),
    eq(placeLikes.placeId, placeId),
    eq(placeLikes.userId, user.id),
  );

  const existing = await db
    .select({ id: placeLikes.id })
    .from(placeLikes)
    .where(where)
    .limit(1);

  if (existing.length) {
    await db.delete(placeLikes).where(where);
    return { liked: false };
  }

  await db
    .insert(placeLikes)
    .values({ tripId, placeId, userId: user.id })
    .onConflictDoNothing();

  // ── Huddle side effects (best-effort; the heart itself already landed). ──
  try {
    const snapRow = await db.query.cachedPlaces.findFirst({
      where: eq(cachedPlaces.placeId, placeId),
    });
    const snap = (snapRow?.snapshot ?? {}) as {
      name?: string;
      photoRef?: string | null;
      rating?: number | null;
      category?: string | null;
    };
    const placeName = snap.name ?? null;
    const photoUrl = snap.photoRef
      ? `/api/discover/photo?ref=${encodeURIComponent(snap.photoRef)}&w=800`
      : null;

    await logActivity({
      tripId,
      eventType: "place_hearted",
      placeId,
      placeName,
      placePhotoUrl: photoUrl,
    });

    // Crew suggestion card — only when there's a crew to decide with, and
    // only one open card per place.
    const crew = await db
      .select({ userId: tripMembers.userId })
      .from(tripMembers)
      .where(eq(tripMembers.tripId, tripId));
    if (crew.length > 1) {
      const open = await db
        .select({ id: huddleDecisions.id })
        .from(huddleDecisions)
        .where(
          and(
            eq(huddleDecisions.tripId, tripId),
            eq(huddleDecisions.placeId, placeId),
            eq(huddleDecisions.type, "suggestion"),
            eq(huddleDecisions.status, "open"),
          ),
        )
        .limit(1);
      if (!open.length) {
        await db.insert(huddleDecisions).values({
          tripId,
          type: "suggestion",
          status: "open",
          placeId,
          placeName,
          placePhotoUrl: photoUrl,
          placeRating: snap.rating != null ? String(snap.rating) : null,
          placeCategory: snap.category ?? null,
          createdBy: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        });
      }

      // 🔥 Crew Match: 2+ distinct members hearted this place.
      const [{ count: distinctLikers }] = await db
        .select({ count: sql<number>`count(distinct user_id)::int` })
        .from(placeLikes)
        .where(and(eq(placeLikes.tripId, tripId), eq(placeLikes.placeId, placeId)));
      if (distinctLikers === 2) {
        await logActivity({
          tripId,
          eventType: "crew_match",
          placeId,
          placeName,
          placePhotoUrl: photoUrl,
          isSystem: true,
        });
      }
    }
  } catch {
    /* heart already saved — Huddle plumbing must never fail the toggle */
  }

  return { liked: true };
}
