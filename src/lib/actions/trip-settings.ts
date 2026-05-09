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

export async function deleteTrip(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  await assertOwner(tripId);

  await db.delete(trips).where(eq(trips.id, tripId));
  redirect("/dashboard");
}
