"use server";

import { db } from "@/lib/db";
import { placeInteractions, userTasteVectors, placeTasteTags, placeLikes, tripMembers, profiles } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  nudgeVector, seedsFromTiles, NEUTRAL_VECTOR,
  type FiveDimVector, type TasteSignal,
} from "@/lib/taste-engine";

/**
 * Phase 6 §5-D — the signal layer. Every interaction lands in
 * place_interactions and nudges the user's durable 5-dim vector.
 * Returns the running interaction count so the client can fire the
 * "Your Discover feed just got smarter ✨" toast at 10.
 */
export async function recordInteraction(input: {
  tripId: string;
  placeId: string;
  signal: TasteSignal | "visited_rated_negative";
  reason?: "too_pricey" | "too_touristy" | "not_my_thing";
}): Promise<{ interactionCount: number }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  // AUTHZ: input.tripId was unverified — any signed-in user could write
  // interaction rows against any trip id.
  {
    const { getTripWithMembership } = await import("@/lib/actions/trips");
    if (!(await getTripWithMembership(input.tripId, user.id))) {
      throw new Error("Trip not found or access denied");
    }
  }

  await db.insert(placeInteractions).values({
    userId: user.id,
    placeId: input.placeId,
    tripId: input.tripId,
    signal: input.signal,
    reason: input.reason ?? null,
  });

  // Nudge the durable vector when the place is tagged.
  const [tags, vecRow] = await Promise.all([
    db.query.placeTasteTags.findFirst({ where: eq(placeTasteTags.placeId, input.placeId) }),
    db.query.userTasteVectors.findFirst({ where: eq(userTasteVectors.userId, user.id) }),
  ]);

  const current: FiveDimVector = vecRow
    ? {
        budget: Number(vecRow.budget), discovery: Number(vecRow.discovery),
        energy: Number(vecRow.energy), vibe: Number(vecRow.vibe), depth: Number(vecRow.depth),
      }
    : { ...NEUTRAL_VECTOR };
  const count = (vecRow?.interactionCount ?? 0) + 1;

  let next = current;
  if (tags && input.signal !== "visited_rated_negative") {
    next = nudgeVector(
      current,
      { budget: tags.budget, discovery: tags.discovery, energy: tags.energy, vibe: tags.vibe, depth: tags.depth },
      input.signal as TasteSignal,
      count,
    );
  }

  await db
    .insert(userTasteVectors)
    .values({
      userId: user.id,
      budget: String(next.budget), discovery: String(next.discovery),
      energy: String(next.energy), vibe: String(next.vibe), depth: String(next.depth),
      interactionCount: count,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userTasteVectors.userId,
      set: {
        budget: String(next.budget), discovery: String(next.discovery),
        energy: String(next.energy), vibe: String(next.vibe), depth: String(next.depth),
        interactionCount: count,
        updatedAt: new Date(),
      },
    });

  return { interactionCount: count };
}

/** §5-F: apply the vibe-onboarding tile picks as the vector seed. */
export async function applyTasteOnboarding(tileKeys: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const seeded = seedsFromTiles(tileKeys);
  await db
    .insert(userTasteVectors)
    .values({
      userId: user.id,
      budget: String(seeded.budget), discovery: String(seeded.discovery),
      energy: String(seeded.energy), vibe: String(seeded.vibe), depth: String(seeded.depth),
      onboarded: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userTasteVectors.userId,
      set: {
        budget: String(seeded.budget), discovery: String(seeded.discovery),
        energy: String(seeded.energy), vibe: String(seeded.vibe), depth: String(seeded.depth),
        onboarded: true,
        updatedAt: new Date(),
      },
    });
}

/** §5-E/G: the taste context a Discover session needs — the user's vector
 *  + crew vectors (named, for champion picks) + onboarding state. */
export async function getTasteContext(tripId: string): Promise<{
  userVector: FiveDimVector | null;
  interactionCount: number;
  onboarded: boolean;
  crewVectors: { userId: string; name: string; vector: FiveDimVector }[];
  crewHeartCount: number;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const members = await db
    .select({ userId: tripMembers.userId, name: profiles.displayName })
    .from(tripMembers)
    .leftJoin(profiles, eq(profiles.id, tripMembers.userId))
    .where(eq(tripMembers.tripId, tripId));

  const vecRows = members.length
    ? await db
        .select()
        .from(userTasteVectors)
        .where(inArray(userTasteVectors.userId, members.map((m) => m.userId)))
    : [];

  const toVec = (r: (typeof vecRows)[number]): FiveDimVector => ({
    budget: Number(r.budget), discovery: Number(r.discovery),
    energy: Number(r.energy), vibe: Number(r.vibe), depth: Number(r.depth),
  });

  const mine = vecRows.find((r) => r.userId === user.id);
  const [{ count: crewHeartCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(placeLikes)
    .where(and(eq(placeLikes.tripId, tripId), sql`${placeLikes.userId} != ${user.id}`));

  return {
    userVector: mine ? toVec(mine) : null,
    interactionCount: mine?.interactionCount ?? 0,
    onboarded: mine?.onboarded ?? false,
    crewVectors: vecRows
      .filter((r) => r.userId !== user.id)
      .map((r) => ({
        userId: r.userId,
        name: (members.find((m) => m.userId === r.userId)?.name ?? "Someone").split(" ")[0],
        vector: toVec(r),
      })),
    crewHeartCount,
  };
}

/** §5-C helper: batch-read tags for the feed (client ranks with them). */
export async function getPlaceTags(placeIds: string[]): Promise<Record<string, FiveDimVector>> {
  if (!placeIds.length) return {};
  const rows = await db
    .select()
    .from(placeTasteTags)
    .where(inArray(placeTasteTags.placeId, placeIds.slice(0, 200)));
  const out: Record<string, FiveDimVector> = {};
  for (const r of rows) {
    out[r.placeId] = { budget: r.budget, discovery: r.discovery, energy: r.energy, vibe: r.vibe, depth: r.depth };
  }
  return out;
}
