"use server";

import { db } from "@/lib/db";
import { settlements, activities } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { revalidatePath } from "next/cache";

/**
 * Phase 6 §8-A: record a settled debt pair. Writes the settlements row and
 * a Pulse system line ("SAR 60 from Memo marked settled 🤝").
 */
export async function markSettled(input: {
  tripId: string;
  creditorId: string;
  debtorId: string;
  amount: number;
  currency: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await db.insert(settlements).values({
    tripId: input.tripId,
    creditorId: input.creditorId,
    debtorId: input.debtorId,
    amount: String(input.amount),
    currency: input.currency,
    createdBy: user.id,
  });

  await db
    .insert(activities)
    .values({
      tripId: input.tripId,
      actorId: user.id,
      eventType: "expense_settled",
      amount: String(input.amount),
      currency: input.currency,
      metadata: { creditorId: input.creditorId, debtorId: input.debtorId },
    })
    .catch(() => {});

  revalidatePath(`/trips/${input.tripId}`);
  revalidatePath(`/trips/${input.tripId}/money`);
}
