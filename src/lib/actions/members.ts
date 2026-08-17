"use server";

import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";

/**
 * authz-2: there was NO way to leave a trip or remove someone from one — a
 * member added by a leaked link stayed forever. Two narrow actions:
 *
 *  leaveTrip     — self only. The owner cannot leave (the trip would be
 *                  orphaned); they delete the trip instead.
 *  removeMember  — owner only, never self, and the target must be a member of
 *                  THIS trip (the object is scoped to the authorized trip —
 *                  same rule as every other action after fix/authz).
 */
export async function leaveTrip(tripId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const me = trip.members.find((m) => m.userId === user.id);
  if (me?.role === "owner") throw new Error("The owner can't leave — delete the trip instead");

  await db
    .delete(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)));

  revalidatePath(`/trips/${tripId}/members`);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function removeMember(tripId: string, targetUserId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) throw new Error("Only the trip owner can remove members");
  if (targetUserId === user.id) throw new Error("Use leave, not remove, for yourself");

  const target = trip.members.find((m) => m.userId === targetUserId);
  if (!target) throw new Error("Member not found");
  if (target.role === "owner") throw new Error("Owners can't be removed");

  await db
    .delete(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, targetUserId)));

  revalidatePath(`/trips/${tripId}/members`);
  revalidatePath(`/trips/${tripId}`);
}
