"use server";

import { db } from "@/lib/db";
import {
  huddleDecisions, decisionReactions, activities, itineraryItems, tripMembers,
} from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { revalidatePath } from "next/cache";

/**
 * Phase 6 §4 — Huddle server actions: decision reactions with majority
 * auto-add, polls, and the Pulse activity log. The only way to post to
 * the Pulse is to DO something (§4-B: no text composer, ever).
 */

/** §4-B: write an activity row (best-effort — Pulse never blocks the action). */
export async function logActivity(input: {
  tripId: string;
  eventType: string;
  placeId?: string | null;
  placeName?: string | null;
  placePhotoUrl?: string | null;
  stopId?: string | null;
  expenseId?: string | null;
  amount?: number | null;
  amountBase?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  isSystem?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) return;
  await db
    .insert(activities)
    .values({
      tripId: input.tripId,
      actorId: user.id,
      eventType: input.eventType,
      placeId: input.placeId ?? null,
      placeName: input.placeName ?? null,
      placePhotoUrl: input.placePhotoUrl ?? null,
      stopId: input.stopId ?? null,
      expenseId: input.expenseId ?? null,
      amount: input.amount != null ? String(input.amount) : null,
      amountBase: input.amountBase != null ? String(input.amountBase) : null,
      currency: input.currency ?? null,
      metadata: input.metadata ?? null,
      isSystem: input.isSystem ?? false,
    })
    .catch(() => {});
}

/**
 * §4-A: cast/retract a reaction on a decision card. `add_it` reaching
 * ceil(crew/2) auto-adds the place as a Suggested stop and resolves the
 * card; the outcome + a system line land in the Pulse.
 */
export async function reactToDecision(
  decisionId: string,
  tripId: string,
  reaction: "add_it" | "love" | "discuss" | "approve" | "claim",
): Promise<{ cast: boolean; resolved?: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  const existing = await db
    .select({ id: decisionReactions.id })
    .from(decisionReactions)
    .where(
      and(
        eq(decisionReactions.decisionId, decisionId),
        eq(decisionReactions.userId, user.id),
        eq(decisionReactions.reaction, reaction),
      ),
    )
    .limit(1);

  if (existing.length) {
    await db.delete(decisionReactions).where(eq(decisionReactions.id, existing[0].id));
    revalidatePath(`/trips/${tripId}/huddle`);
    return { cast: false };
  }

  await db
    .insert(decisionReactions)
    .values({ decisionId, userId: user.id, reaction })
    .onConflictDoNothing();

  // Majority auto-add for suggestion cards.
  let resolved = false;
  if (reaction === "add_it") {
    const decision = await db.query.huddleDecisions.findFirst({
      where: eq(huddleDecisions.id, decisionId),
    });
    if (decision && decision.status === "open" && decision.type === "suggestion") {
      const [{ count: addVotes }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(decisionReactions)
        .where(and(eq(decisionReactions.decisionId, decisionId), eq(decisionReactions.reaction, "add_it")));
      const crew = await db
        .select({ userId: tripMembers.userId })
        .from(tripMembers)
        .where(eq(tripMembers.tripId, tripId));
      // QA BUG-4: a true majority is floor(n/2)+1 — ceil(n/2) let a single
      // vote resolve 2-person (and tie 4-person) decisions.
      const majority = Math.floor(crew.length / 2) + 1;

      if (addVotes >= majority) {
        // Slot the place onto its suggested day (or the trip's first day).
        const day = decision.suggestedDay ?? trip.startDate;
        const dayRows = await db
          .select({ sortOrder: itineraryItems.sortOrder })
          .from(itineraryItems)
          .where(and(eq(itineraryItems.tripId, tripId), eq(itineraryItems.dayDate, day)));
        const [stop] = await db
          .insert(itineraryItems)
          .values({
            tripId,
            dayDate: day,
            title: decision.placeName ?? "Suggested stop",
            type: "activity",
            locationName: decision.placeName,
            status: "proposed",
            sortOrder: dayRows.length,
            googlePlaceId: decision.placeId,
            provider: "google",
            photoUrl: decision.placePhotoUrl,
            rating: decision.placeRating != null ? Number(decision.placeRating) : null,
            createdBy: user.id,
          })
          .returning({ id: itineraryItems.id });

        await db
          .update(huddleDecisions)
          .set({ status: "resolved", outcome: "added", resolvedAt: new Date() })
          .where(eq(huddleDecisions.id, decisionId));
        resolved = true;

        await logActivity({
          tripId,
          eventType: "suggestion_added",
          placeId: decision.placeId,
          placeName: decision.placeName,
          placePhotoUrl: decision.placePhotoUrl,
          stopId: stop.id,
          metadata: { day, votes: addVotes },
        });
        revalidatePath(`/trips/${tripId}/itinerary`);
        revalidatePath(`/trips/${tripId}`);
      }
    }
  }

  revalidatePath(`/trips/${tripId}/huddle`);
  return { cast: true, resolved };
}

/** §4-A poll cards: create with 2–4 options. */
export async function createPoll(tripId: string, question: string, options: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");
  // QA BUG-12/14: server-side guardrails — non-empty unique options (twin
  // "🦖" options posted fine before) and a 200-char question cap.
  const clean = options.map((o) => o.trim()).filter((o) => o.length >= 1).slice(0, 4);
  const seen = new Set<string>();
  for (const o of clean) {
    const key = o.toLowerCase();
    if (seen.has(key)) throw new Error("Poll options must be unique");
    seen.add(key);
  }
  const q = question.trim();
  if (!q || clean.length < 2) throw new Error("A poll needs a question and 2–4 options");
  if (q.length > 200) throw new Error("Keep the question under 200 characters");

  await db.insert(huddleDecisions).values({
    tripId,
    type: "poll",
    status: "open",
    createdBy: user.id,
    pollQuestion: question.trim(),
    pollOptions: clean.map((label, i) => ({ id: String(i), label, voterIds: [] })),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // auto-close in 24h
  });
  revalidatePath(`/trips/${tripId}/huddle`);
}

/** §4-A poll vote — tap-to-select; majority or 24h closes it. */
export async function votePoll(decisionId: string, tripId: string, optionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  const decision = await db.query.huddleDecisions.findFirst({
    where: eq(huddleDecisions.id, decisionId),
  });
  if (!decision || decision.type !== "poll" || decision.status !== "open") return;

  type Opt = { id: string; label: string; voterIds: string[] };
  const options = (decision.pollOptions as Opt[]) ?? [];
  for (const o of options) o.voterIds = o.voterIds.filter((v) => v !== user.id);
  const target = options.find((o) => o.id === optionId);
  if (!target) return;
  target.voterIds.push(user.id);

  // QA BUG-4: floor(n/2)+1 — one Marco vote must not decide for Rania.
  const majority = Math.floor(trip.members.length / 2) + 1;
  const winner = options.find((o) => o.voterIds.length >= majority);

  await db
    .update(huddleDecisions)
    .set({
      pollOptions: options,
      ...(winner
        ? { status: "resolved" as const, outcome: `closed:${winner.label}`, resolvedAt: new Date() }
        : {}),
    })
    .where(eq(huddleDecisions.id, decisionId));

  if (winner) {
    const tally = options.map((o) => o.voterIds.length).sort((a, b) => b - a);
    await logActivity({
      tripId,
      eventType: "poll_closed",
      metadata: { question: decision.pollQuestion, winner: winner.label, tally: tally.join("–") },
      isSystem: true,
    });
  }
  revalidatePath(`/trips/${tripId}/huddle`);
}

/** §4-A timeout sweep: expire open decisions past expires_at ("Filed under
 *  maybe"). Called on Huddle page load — cheap and idempotent. */
export async function expireStaleDecisions(tripId: string) {
  await db
    .update(huddleDecisions)
    .set({ status: "expired", outcome: "passed", resolvedAt: new Date() })
    .where(
      and(
        eq(huddleDecisions.tripId, tripId),
        eq(huddleDecisions.status, "open"),
        sql`${huddleDecisions.expiresAt} < now()`,
      ),
    )
    .catch(() => {});
}
