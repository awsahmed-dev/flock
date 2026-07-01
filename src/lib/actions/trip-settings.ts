"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function assertOwner(tripId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member || member.role !== "owner") throw new Error("Not authorized");
  return user;
}

export async function updateTrip(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  await assertOwner(tripId);

  const name = formData.get("name") as string;
  const destination = formData.get("destination") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const budgetRaw = formData.get("budgetTotal") as string;
  const budgetTotal = budgetRaw ? parseFloat(budgetRaw) : null;
  const currency = formData.get("currency") as string;

  await db
    .update(trips)
    .set({ name, destination, startDate, endDate, budgetTotal, currency })
    .where(eq(trips.id, tripId));

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/settings`);
}

/**
 * §2-D: set the trip's total budget from the NOW cockpit. Membership-level
 * (not owner-only) — budgeting is collaborative, unlike renaming/deleting.
 */
export async function setTripBudget(
  tripId: string,
  budgetTotal: number | null,
  currency: string,
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
  });
  if (!member) throw new Error("Not authorized");

  await db.update(trips).set({ budgetTotal, currency }).where(eq(trips.id, tripId));
  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/expenses`);
}

export async function deleteTrip(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  await assertOwner(tripId);

  await db.delete(trips).where(eq(trips.id, tripId));
  redirect("/dashboard");
}
