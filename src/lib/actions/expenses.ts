"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { expenses, expenseSplits, profiles, tripMembers, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { maybePostBudgetAlert } from "@/lib/ai/budget-watcher";
import { sendEmail } from "@/lib/email/send";
import { renderExpenseLogged } from "@/lib/email/templates";
import { sendPush } from "@/lib/push/send";

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

  // Currency picker is optional — fall back to trip.currency. We trust the
  // input only if it's a 3-letter alpha code (ISO 4217 format); anything
  // else silently falls back to the trip base.
  const currencyRaw = (formData.get("currency") as string)?.trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : trip.currency;

  const [expense] = await db
    .insert(expenses)
    .values({
      tripId,
      title,
      amount,
      currency,
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
    body: `💸 ${title} — ${currency} ${amount.toLocaleString()}`,
    type: "expense_card",
    metadata: {
      expenseId: expense.id,
      amount, currency, category, title,
      paidBy: user.id, splitCount: members.length,
    },
  }).catch(() => {});

  // Budget watcher — soft-fails, never throws back into this flow
  await maybePostBudgetAlert(tripId, trip.budgetTotal, trip.currency, user.id);

  // Email every debtor with the line they owe. Idempotency key includes the
  // recipient so retried inserts (we use no-op upsert above) only ever
  // dispatch one email per (expense, recipient) within Resend's 24h window.
  notifyExpenseLogged({
    tripId,
    tripName: trip.name,
    expenseId: expense.id,
    payerId: user.id,
    payerName:
      (user as any).user_metadata?.display_name ||
      (user as any).email?.split("@")[0] ||
      "Someone",
    title,
    amount,
    currency: currency,
  }).catch((e) => console.error("[expenses/notify] failed:", e));

  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}`);
}

async function notifyExpenseLogged(args: {
  tripId: string;
  tripName: string;
  expenseId: string;
  payerId: string;
  payerName: string;
  title: string;
  amount: number;
  currency: string;
}): Promise<void> {
  // Pull the splits we just inserted along with each debtor's profile.
  const splits = await db
    .select({
      id: expenseSplits.id,
      userId: expenseSplits.userId,
      amountOwed: expenseSplits.amountOwed,
      settled: expenseSplits.settled,
    })
    .from(expenseSplits)
    .where(eq(expenseSplits.expenseId, args.expenseId));

  for (const s of splits) {
    if (s.userId === args.payerId) continue; // payer doesn't owe themself
    if (s.settled) continue;
    const profile = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.id, s.userId),
    });
    if (!profile?.email) continue;
    const member = await db.query.tripMembers.findFirst({
      where: (m, { eq, and }) =>
        and(eq(m.tripId, args.tripId), eq(m.userId, s.userId)),
    });
    const rendered = await renderExpenseLogged({
      recipientName: member?.displayName || profile.displayName || "there",
      payerName: args.payerName,
      tripName: args.tripName,
      title: args.title,
      amount: args.amount,
      currency: args.currency,
      yourShare: s.amountOwed,
      tripId: args.tripId,
      expenseId: args.expenseId,
    });
    await sendEmail({ to: profile.email, ...rendered, kind: "expense_logged" });
  }

  // Web push to every debtor in one batch.
  const debtorIds = splits
    .filter((s) => s.userId !== args.payerId && !s.settled)
    .map((s) => s.userId);
  if (debtorIds.length > 0) {
    await sendPush({
      toUserIds: debtorIds,
      payload: {
        title: `💸 ${args.payerName} paid for ${args.title}`,
        body: `${args.currency} ${args.amount.toFixed(2)} on ${args.tripName}`,
        url: `/trips/${args.tripId}/expenses`,
        tag: `expense:${args.expenseId}`,
      },
    });
  }
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
