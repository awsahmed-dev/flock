"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { expenses, expenseSplits, profiles, tripMembers, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { maybePostBudgetAlert } from "@/lib/ai/budget-watcher";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

// ─── Log expense ──────────────────────────────────────────────────────────────

export async function createExpense(formData: FormData) {
  const user = await getAuthenticatedUser();
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  // Ensure profile exists
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        (user as any).user_metadata?.display_name ||
        (user as any).email?.split("@")[0] ||
        "Traveler",
      email: (user as any).email,
    })
    .onConflictDoNothing();

  const title = formData.get("title") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const category = (formData.get("category") as string) || "other";
  const expenseDate = formData.get("expenseDate") as string;
  const notes = (formData.get("notes") as string) || null;
  const splitType = formData.get("splitType") as string; // "equal" | "custom"

  if (!title || isNaN(amount) || !expenseDate) {
    throw new Error("Missing required fields");
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      tripId,
      title,
      amount,
      currency: trip.currency,
      paidBy: user.id,
      category: category as any,
      expenseDate,
      notes,
    })
    .returning();

  // Get all trip members for splitting
  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));

  if (splitType === "equal" && members.length > 0) {
    const perPerson = amount / members.length;
    await db.insert(expenseSplits).values(
      members.map((m) => ({
        expenseId: expense.id,
        userId: m.userId,
        amountOwed: perPerson,
        settled: m.userId === user.id, // Payer is pre-settled
      }))
    );
  }
  // Custom splits are handled separately via updateExpenseSplits

  // Auto-post the expense to chat (mirrors mobile app)
  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    body: `💸 ${title} — ${trip.currency} ${amount.toLocaleString()}`,
    type: "expense_card",
    metadata: {
      expenseId: expense.id,
      amount, currency: trip.currency, category, title,
      paidBy: user.id, splitCount: members.length,
    },
  }).catch(() => {});

  // Budget watcher — soft-fails, never throws back into this flow
  await maybePostBudgetAlert(tripId, trip.budgetTotal, trip.currency, user.id);

  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}`);
}

// ─── Delete expense ───────────────────────────────────────────────────────────

export async function deleteExpense(formData: FormData) {
  const user = await getAuthenticatedUser();
  const expenseId = formData.get("expenseId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const expense = await db.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
  });
  if (!expense) throw new Error("Expense not found");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );
  if (expense.paidBy !== user.id && !isOwner) {
    throw new Error("Not authorized to delete this expense");
  }

  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath(`/trips/${tripId}/expenses`);
}

// ─── Mark split as settled ────────────────────────────────────────────────────

export async function settleSplit(formData: FormData) {
  const user = await getAuthenticatedUser();
  const splitId = formData.get("splitId") as string;
  const tripId = formData.get("tripId") as string;

  // Only the payer or the debtor can settle
  const split = await db.query.expenseSplits.findFirst({
    where: eq(expenseSplits.id, splitId),
  });
  if (!split) throw new Error("Split not found");

  await db
    .update(expenseSplits)
    .set({ settled: true, settledAt: new Date() })
    .where(eq(expenseSplits.id, splitId));

  revalidatePath(`/trips/${tripId}/expenses`);
}
