"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

async function requireOwner(tripId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await db.query.trips.findFirst({ where: eq(trips.id, tripId) });
  if (!trip || trip.createdBy !== user.id) throw new Error("Only the trip owner can change sharing settings");
  return { user, trip };
}

export async function enableSharing(tripId: string): Promise<string> {
  const { trip } = await requireOwner(tripId);
  if (trip.shareToken) return trip.shareToken; // already enabled

  const token = randomBytes(16).toString("hex");
  await db.update(trips).set({ shareToken: token }).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}/settings`);
  return token;
}

export async function disableSharing(tripId: string): Promise<void> {
  await requireOwner(tripId);
  await db.update(trips).set({ shareToken: null }).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}/settings`);
}

export async function regenerateShareToken(tripId: string): Promise<string> {
  await requireOwner(tripId);
  const token = randomBytes(16).toString("hex");
  await db.update(trips).set({ shareToken: token }).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}/settings`);
  return token;
}
