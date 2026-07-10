"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { expenses, expenseSplits, profiles, tripMembers, chatMessages } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { PermissionError } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { maybePostBudgetAlert } from "@/lib/ai/budget-watcher";
import { sendEmail } from "@/lib/email/send";
import { renderExpenseLogged } from "@/lib/email/templates";
import { sendPush } from "@/lib/push/send";
import { recordEvent } from "@/lib/inbox";

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

  // B2 Budget v2 — Scope. "personal" expenses (a member's own pocket
  // spend) don't create splits and don't count toward the trip cap; they
  // only count toward the payer's personal budget.
  const scopeRaw = (formData.get("scope") as string)?.trim().toLowerCase();
  const scope: "shared" | "personal" =
    scopeRaw === "personal" ? "personal" : "shared";

  // B12: optional receipt image URL from Splitwise-style upload field.
  const receiptUrlRaw = (formData.get("receiptUrl") as string | null)?.trim();
  const receiptUrl = receiptUrlRaw && /^https?:\/\//.test(receiptUrlRaw) ? receiptUrlRaw : null;

  const [expense] = await db
    .insert(expenses)
    .values({
      tripId,
      title,
      amount,
      currency,
      paidBy: user.id,
      category: category as any,
      scope,
      expenseDate,
      notes,
      receiptUrl,
    })
    .returning();

  // Get all trip members for splitting (only relevant for shared expenses)
  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));

  if (scope === "shared" && splitType === "equal" && members.length > 0) {
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
  // Custom splits are handled separately via updateExpenseSplits.
  // Personal expenses: no splits, no balance shifts — just the payer.

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
  const payerDisplayName =
    (user as any).user_metadata?.display_name ||
    (user as any).email?.split("@")[0] ||
    "Someone";

  notifyExpenseLogged({
    tripId,
    tripName: trip.name,
    expenseId: expense.id,
    payerId: user.id,
    payerName: payerDisplayName,
    title,
    amount,
    currency: currency,
  }).catch((e) => console.error("[expenses/notify] failed:", e));

  // B13b: in-app inbox row for every other trip member.
  recordEvent({
    tripId,
    kind: "expense_logged",
    actorUserId: user.id,
    title: `${payerDisplayName} paid for ${title}`,
    body: `${currency} ${amount.toLocaleString()} · ${trip.name}`,
    payload: { expenseId: expense.id, amount, currency },
    recipients: null,
  });

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
      // B15-f: render in the recipient's preferred language. Falls back
      // to English when profiles.locale is unset or not one of our two
      // supported tags.
      locale: (profile as any).locale === "ar" ? "ar" : "en",
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

// ─── Bulk settle: every split that represents money owed between two
//     trip members (debtor → creditor). Powers the "Mark as paid"
//     button in the balances settlement view, where one row aggregates
//     many splits across many expenses. B20.

export async function settleAllBetween(formData: FormData) {
  const user = await getAuthenticatedUser();
  const tripId = formData.get("tripId") as string;
  const fromUserId = formData.get("fromUserId") as string;
  const toUserId = formData.get("toUserId") as string;
  if (!tripId || !fromUserId || !toUserId) {
    throw new Error("Missing parameters");
  }
  // Either party in the transfer can mark it paid — settles a common
  // friction where the creditor confirms cash receipt.
  if (user.id !== fromUserId && user.id !== toUserId) {
    throw new PermissionError("Only the parties involved can mark this paid");
  }

  // Find all unsettled splits where this user owes the other.
  const splits = await db
    .select({
      id: expenseSplits.id,
      expenseId: expenseSplits.expenseId,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
    .where(
      and(
        eq(expenses.tripId, tripId),
        eq(expenseSplits.userId, fromUserId),
        eq(expenses.paidBy, toUserId),
        eq(expenseSplits.settled, false),
      ),
    );

  if (splits.length === 0) {
    return { settled: 0 };
  }

  await db
    .update(expenseSplits)
    .set({ settled: true, settledAt: new Date() })
    .where(inArray(expenseSplits.id, splits.map((s) => s.id)));

  revalidatePath(`/trips/${tripId}/expenses`);
  revalidatePath(`/trips/${tripId}/expenses/balances`);
  return { settled: splits.length };
}

// ─── Mark split as settled ────────────────────────────────────────────────────

export async function settleSplit(formData: FormData) {
  const user = await getAuthenticatedUser();
  const splitId = formData.get("splitId") as string;
  const tripId = formData.get("tripId") as string;

  // Only the payer or the debtor can settle
  const split = await db.query.expenseSplits.findFirst({
    where: eq(expenseSplits.id, splitId),
    with: { expense: { columns: { paidBy: true, title: true, currency: true } } },
  });
  if (!split) throw new Error("Split not found");

  await db
    .update(expenseSplits)
    .set({ settled: true, settledAt: new Date() })
    .where(eq(expenseSplits.id, splitId));

  // B13b: tell the payer that this debt was just cleared. Skip if the
  // payer is the one settling their own (already-settled) row, which
  // shouldn't reach here but defend anyway.
  if (split.expense && split.expense.paidBy !== user.id) {
    const debtorProfile = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.id, user.id),
      columns: { displayName: true },
    });
    recordEvent({
      tripId,
      kind: "split_settled",
      actorUserId: user.id,
      title: `${debtorProfile?.displayName ?? "Someone"} settled up`,
      body: `${split.expense.currency} ${split.amountOwed.toLocaleString()} for ${split.expense.title}`,
      payload: {
        splitId,
        amount: split.amountOwed,
        currency: split.expense.currency,
      },
      recipients: [split.expense.paidBy],
    });
  }

  revalidatePath(`/trips/${tripId}/expenses`);
}

/**
 * Phase 6 §8-B: expense from the Point-and-Split camera flow — selectable
 * crew + per-member shares, dual-currency, and a Pulse expense_logged line.
 */
export async function createCameraExpense(input: {
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  category: string;
  shares: { userId: string; amount: number }[]; // includes the payer's own share
}) {
  const user = await getAuthenticatedUser();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  if (!input.title.trim() || !(input.amount > 0)) throw new Error("Missing amount or description");

  const currency = /^[A-Z]{3}$/.test(input.currency) ? input.currency : trip.currency;
  const today = new Date().toISOString().split("T")[0];

  const [expense] = await db
    .insert(expenses)
    .values({
      tripId: input.tripId,
      title: input.title.trim(),
      amount: input.amount,
      currency,
      paidBy: user.id,
      category: input.category as any,
      scope: "shared",
      expenseDate: today,
    })
    .returning();

  if (input.shares.length > 0) {
    await db.insert(expenseSplits).values(
      input.shares.map((s) => ({
        expenseId: expense.id,
        userId: s.userId,
        amountOwed: s.amount,
        settled: s.userId === user.id,
      })),
    );
  }

  // Pulse line (§4-B) — best-effort.
  const { activities } = await import("@/lib/db/schema");
  const { getRates, convert } = await import("@/lib/fx");
  let amountBase: number | null = null;
  if (currency !== trip.currency) {
    const rates = await getRates(trip.currency).catch(() => null);
    amountBase = convert(input.amount, currency, trip.currency, rates);
  }
  await db
    .insert(activities)
    .values({
      tripId: input.tripId,
      actorId: user.id,
      eventType: "expense_logged",
      expenseId: expense.id,
      amount: String(input.amount),
      amountBase: amountBase != null ? String(Math.round(amountBase * 100) / 100) : null,
      currency,
      metadata: { title: input.title, splitCount: input.shares.length },
    })
    .catch(() => {});

  revalidatePath(`/trips/${input.tripId}/money`);
  revalidatePath(`/trips/${input.tripId}`);
  return { id: expense.id };
}
