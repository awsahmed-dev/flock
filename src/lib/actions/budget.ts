"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Each member sets their own personal budget for a trip. The trip-level
 * `budget_total` is the owner's call (shared pot); this is the individual
 * pocket-money cap each traveler decides for themselves.
 *
 * Passing 0 / empty / NaN clears the budget (NULL in the DB) — useful if
 * a member decides not to track personally.
 */
export async function setPersonalBudget(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const tripId = formData.get("tripId") as string;
  if (!tripId) throw new Error("Missing tripId");

  const raw = (formData.get("personalBudget") as string | null)?.trim() ?? "";
  let value: number | null = null;
  if (raw.length > 0) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Budget must be a positive number");
    }
    value = parsed > 0 ? parsed : null;
  }

  await db
    .update(tripMembers)
    .set({ personalBudget: value })
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)));

  revalidatePath(`/trips/${tripId}`);
  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}/settings`);
}
