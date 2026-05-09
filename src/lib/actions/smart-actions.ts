"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import {
  itineraryItems,
  expenses,
  expenseSplits,
  votes,
  voteOptions,
  profiles,
  tripMembers,
  chatMessages,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { maybePostBudgetAlert } from "@/lib/ai/budget-watcher";

const TYPE_EMOJI: Record<string, string> = {
  activity: "✨",
  accommodation: "🏨",
  transport: "✈️",
  meal: "🍽️",
};

async function ensureProfile(user: any) {
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
      email: user.email,
    })
    .onConflictDoNothing();
}

async function authed() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/**
 * Apply a single AI-detected action to a trip. Used by the SmartActionChips
 * UI under chat messages — Claude Haiku detects intent, then a single chip
 * click commits with sane defaults the user can edit afterwards.
 *
 * Defaults for missing fields:
 * - itinerary.dayDate → trip.startDate (user can drag-reorder later)
 * - expense.currency → trip.currency
 * - vote.deadline → null (open until manually closed)
 */
export async function applyDetectedAction(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  const kind = formData.get("kind") as string;
  const payloadRaw = formData.get("payload") as string;

  if (!tripId || !kind || !payloadRaw) throw new Error("Missing parameters");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await ensureProfile(user);

  let payload: any;
  try {
    payload = JSON.parse(payloadRaw);
  } catch {
    throw new Error("Bad payload");
  }

  if (kind === "itinerary") {
    const title = String(payload.title ?? "").trim();
    if (!title) throw new Error("Missing title");
    const type =
      ["activity", "meal", "accommodation", "transport"].includes(payload.type)
        ? (payload.type as "activity" | "meal" | "accommodation" | "transport")
        : "activity";

    await db.insert(itineraryItems).values({
      tripId,
      dayDate: trip.startDate,
      title,
      type,
      startTime: null,
      locationName: payload.locationName || null,
      locationLat: null,
      locationLng: null,
      costEstimate: typeof payload.cost === "number" ? payload.cost : null,
      bookingUrl: null,
      notes: "Added from chat suggestion — edit any details",
      status: "proposed",
      sortOrder: 0,
      createdBy: user.id,
    });

    await db
      .insert(chatMessages)
      .values({
        tripId,
        userId: user.id,
        body: `${TYPE_EMOJI[type] ?? "📍"} New plan: ${title}`,
        type: "itinerary_card",
        metadata: { fromAi: true, title, type, cost: payload.cost ?? null },
      })
      .catch(() => {});

    revalidatePath(`/trips/${tripId}/itinerary`);
    revalidatePath(`/trips/${tripId}`);
    return;
  }

  if (kind === "expense") {
    const title = String(payload.title ?? "").trim();
    const amount = Number(payload.amount);
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid expense");
    }
    const category =
      ["accommodation", "transport", "food", "activity", "shopping", "other"].includes(
        payload.category,
      )
        ? payload.category
        : "other";

    const today = new Date().toISOString().slice(0, 10);

    const [expense] = await db
      .insert(expenses)
      .values({
        tripId,
        title,
        amount,
        currency: trip.currency,
        paidBy: user.id,
        category,
        expenseDate: today,
        notes: "Logged from chat suggestion — edit splits if needed",
      })
      .returning();

    // Equal split across all members (matches createExpense default)
    const members = await db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId));
    if (members.length > 0) {
      const perPerson = amount / members.length;
      await db.insert(expenseSplits).values(
        members.map((m) => ({
          expenseId: expense.id,
          userId: m.userId,
          amountOwed: perPerson,
          settled: m.userId === user.id,
        })),
      );
    }

    await db
      .insert(chatMessages)
      .values({
        tripId,
        userId: user.id,
        body: `💸 ${title} — ${trip.currency} ${amount.toLocaleString()}`,
        type: "expense_card",
        metadata: {
          expenseId: expense.id,
          fromAi: true,
          amount,
          currency: trip.currency,
          category,
          title,
          paidBy: user.id,
          splitCount: members.length,
        },
      })
      .catch(() => {});

    await maybePostBudgetAlert(tripId, trip.budgetTotal, trip.currency, user.id);

    revalidatePath(`/trips/${tripId}/expenses`);
    revalidatePath(`/trips/${tripId}`);
    return;
  }

  if (kind === "vote") {
    const question = String(payload.question ?? "").trim();
    const opts: string[] = Array.isArray(payload.options)
      ? payload.options
          .map((o: any) => String(o ?? "").trim())
          .filter((o: string) => o.length > 0)
          .slice(0, 4)
      : [];

    if (!question || opts.length < 2) throw new Error("Invalid vote");

    const [vote] = await db
      .insert(votes)
      .values({
        tripId,
        question,
        deadline: null,
        createdBy: user.id,
      })
      .returning();

    await db.insert(voteOptions).values(
      opts.map((label, idx) => ({
        voteId: vote.id,
        label,
        costEstimate: null,
        sortOrder: idx,
      })),
    );

    await db
      .insert(chatMessages)
      .values({
        tripId,
        userId: user.id,
        body: `📊 New vote: ${question}`,
        type: "vote_card",
        metadata: { voteId: vote.id, fromAi: true, question, options: opts },
      })
      .catch(() => {});

    revalidatePath(`/trips/${tripId}/votes`);
    revalidatePath(`/trips/${tripId}`);
    return;
  }

  throw new Error(`Unknown action kind: ${kind}`);
}
