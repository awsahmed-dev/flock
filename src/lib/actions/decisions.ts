"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { decisions, chatMessages, profiles } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getTripWithMembership } from "./trips";
import { isOwner } from "@/lib/permissions";
import { createItineraryItemFromGooglePlace } from "./itinerary";
import { recordEvent } from "@/lib/inbox";
import { notifyDecisionOpened, notifyDecisionResolved } from "@/lib/notifications";

/**
 * Paxawa v2 — chat-embedded decisions (build-spec Part B). Replaces the Votes
 * page: owner "Ask the crew" or member "Suggest" from a place posts a rich
 * decision card into chat; the crew votes 👍/👎 inline; on a real majority it
 * auto-lands on a day. Pure decision state lives in `decisions`; the chat
 * message carries the place snapshot so the card renders without a Google call.
 */

export interface DecisionPlace {
  placeId: string;
  name: string;
  category: string;
  placeTypes: string[];
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  coords: [number, number];
  address: string | null;
  photoRef: string | null;
  hoursSummary: string | null;
  topTip: string | null;
}

type VoteMap = Record<string, "yes" | "no">;

async function authUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** Real majority of the *whole* crew, and never passable on the proposer's lone
 *  auto-vote (needs ≥2 yes once the trip has a crew). */
function passNeed(memberCount: number): number {
  return Math.max(2, Math.ceil(memberCount / 2));
}

function tally(votes: VoteMap) {
  const vals = Object.values(votes);
  return { yes: vals.filter((v) => v === "yes").length, no: vals.filter((v) => v === "no").length };
}

/** Best-effort crew notification when a decision resolves (added / skipped). */
async function fanoutResolved(
  trip: Awaited<ReturnType<typeof getTripWithMembership>> & object,
  actorId: string,
  placeName: string,
  outcome: "added" | "skipped",
) {
  const memberIds = trip.members.map((m) => m.userId);
  await recordEvent({
    tripId: trip.id,
    kind: "decision_resolved",
    actorUserId: actorId,
    recipients: null,
    title: outcome === "added" ? `Added to the plan` : `Crew passed`,
    body: outcome === "added" ? `${placeName} is now on the plan` : `${placeName} didn't make the cut`,
    payload: { placeName, outcome },
  }).catch(() => {});
  notifyDecisionResolved(memberIds, actorId, placeName, outcome, trip.id, trip.name).catch(() => {});
}

/** Owner "Ask the crew" (neutral) or member "Suggest" (proposer auto-votes yes). */
export async function createDecision(input: {
  tripId: string;
  place: DecisionPlace;
  proposedDay?: string | null;
  note?: string | null;
  closesInHours?: number | null; // default 24h; null = no deadline
  mode: "ask" | "suggest";
}) {
  const user = await authUser();
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  if (trip.members.length < 2) throw new Error("Decisions need a crew");

  // Edge case — don't stack two open cards for the same place. If one is
  // already up for a vote, bounce the caller to it instead of duplicating.
  const existingOpen = await db.query.decisions.findFirst({
    where: and(
      eq(decisions.tripId, input.tripId),
      eq(decisions.placeId, input.place.placeId),
      eq(decisions.status, "open"),
    ),
  });
  if (existingOpen) {
    // Don't stack a duplicate card — bounce the caller back to the live one.
    // Returned (not thrown) so the message survives the server-action boundary.
    return { ok: false as const, reason: "already_open" as const, decisionId: existingOpen.id };
  }

  const proposerName =
    user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler";
  await db.insert(profiles).values({
    id: user.id,
    displayName: proposerName,
    email: user.email,
  }).onConflictDoNothing();

  const closesAt =
    input.closesInHours === null
      ? null
      : new Date(Date.now() + (input.closesInHours ?? 24) * 3600 * 1000);
  const votes: VoteMap = {};
  if (input.mode === "suggest") votes[user.id] = "yes"; // proposer endorses

  const [decision] = await db
    .insert(decisions)
    .values({
      tripId: input.tripId,
      placeId: input.place.placeId,
      snapshot: input.place,
      proposedBy: user.id,
      proposedDay: input.proposedDay ?? null,
      status: "open",
      votes,
      closesAt,
    })
    .returning();

  const [msg] = await db
    .insert(chatMessages)
    .values({
      tripId: input.tripId,
      userId: user.id,
      body: `🗳️ ${input.mode === "ask" ? "Let's decide" : "Suggested"}: ${input.place.name}`,
      type: "decision_card",
      metadata: {
        decisionId: decision.id,
        snapshot: input.place,
        proposedDay: input.proposedDay ?? null,
        note: input.note ?? null,
        closesAt: closesAt?.toISOString() ?? null,
      },
    })
    .returning();

  await db.update(decisions).set({ chatMessageId: msg.id }).where(eq(decisions.id, decision.id));

  // Tell the crew there's something to vote on — in-app inbox + push. Both
  // best-effort: a notification failure must never sink the decision.
  const memberIds = trip.members.map((m) => m.userId);
  await recordEvent({
    tripId: input.tripId,
    kind: "decision_opened",
    actorUserId: user.id,
    recipients: null, // fan out to the whole crew
    title: `${proposerName} ${input.mode === "ask" ? "started a vote" : "suggested a place"}`,
    body: input.place.name,
    payload: { decisionId: decision.id, placeName: input.place.name },
  }).catch(() => {});
  notifyDecisionOpened(
    memberIds, user.id, proposerName, input.place.name, input.mode, input.tripId, trip.name,
  ).catch(() => {});

  revalidatePath(`/trips/${input.tripId}/chat`);
  revalidatePath(`/trips/${input.tripId}/decisions`);
  return { ok: true as const, decisionId: decision.id };
}

export interface DecisionState {
  status: string;
  proposedDay: string | null;
  closesAt: string | null;
  yes: number;
  no: number;
  pending: number;
  memberCount: number;
  myVote: "yes" | "no" | null;
  canManage: boolean;
}

export async function getDecision(decisionId: string): Promise<DecisionState> {
  const user = await authUser();
  const decision = await db.query.decisions.findFirst({ where: eq(decisions.id, decisionId) });
  if (!decision) throw new Error("Decision not found");
  const trip = await getTripWithMembership(decision.tripId, user.id);
  if (!trip) throw new Error("Access denied");
  return toState(decision, trip, user.id);
}

function toState(
  decision: typeof decisions.$inferSelect,
  trip: Awaited<ReturnType<typeof getTripWithMembership>> & object,
  userId: string,
): DecisionState {
  const votes = (decision.votes ?? {}) as VoteMap;
  const memberCount = trip.members.length;
  const { yes, no } = tally(votes);
  return {
    status: decision.status,
    proposedDay: decision.proposedDay,
    closesAt: decision.closesAt ? decision.closesAt.toISOString() : null,
    yes,
    no,
    pending: Math.max(0, memberCount - yes - no),
    memberCount,
    myVote: votes[userId] ?? null,
    canManage: isOwner(trip, userId) || decision.proposedBy === userId,
  };
}

/** Cast / change / retract a vote, then resolve if the crew has spoken. */
export async function voteOnDecision(
  decisionId: string,
  vote: "yes" | "no",
): Promise<DecisionState> {
  const user = await authUser();
  const decision = await db.query.decisions.findFirst({ where: eq(decisions.id, decisionId) });
  if (!decision) throw new Error("Decision not found");
  const trip = await getTripWithMembership(decision.tripId, user.id);
  if (!trip) throw new Error("Access denied");
  if (decision.status !== "open") return toState(decision, trip, user.id);

  const votes = { ...((decision.votes ?? {}) as VoteMap) };
  if (votes[user.id] === vote) delete votes[user.id]; // tap again to retract
  else votes[user.id] = vote;

  const memberCount = trip.members.length;
  const { yes, no } = tally(votes);
  const need = passNeed(memberCount);
  const everyoneVoted = yes + no >= memberCount;

  let status: string = "open";
  if (yes > no && yes >= need) status = "passed";
  else if (everyoneVoted) status = "failed";

  await db
    .update(decisions)
    .set({ votes, status, resolvedAt: status !== "open" ? new Date() : null })
    .where(eq(decisions.id, decisionId));

  if (status !== "open") {
    const snap = decision.snapshot as DecisionPlace;
    if (status === "passed") {
      const day = decision.proposedDay ?? format(parseDateOnly(trip.startDate), "yyyy-MM-dd");
      await createItineraryItemFromGooglePlace({ tripId: decision.tripId, dayDate: day, place: snap }).catch(
        () => {},
      );
    }
    await fanoutResolved(trip, user.id, snap.name, status === "passed" ? "added" : "skipped");
  }

  revalidatePath(`/trips/${decision.tripId}/chat`);
  revalidatePath(`/trips/${decision.tripId}/itinerary`);
  revalidatePath(`/trips/${decision.tripId}/decisions`);
  return toState({ ...decision, votes, status }, trip, user.id);
}

export interface DecisionLensRow {
  meta: {
    decisionId: string;
    snapshot: {
      placeId: string;
      name: string;
      category: string;
      rating: number | null;
      userRatingsTotal: number | null;
      priceLevel: number | null;
      photoRef: string | null;
    };
    proposedDay: string | null;
    note: string | null;
    closesAt: string | null;
  };
  status: string;
  needsMyVote: boolean;
  createdAt: string;
}

/**
 * The Decisions lens (replaces the Votes page). Every decision in the trip,
 * newest first, shaped for the same card the chat renders — plus a per-row
 * `needsMyVote` flag the board uses to default-filter to "your turn".
 */
export async function listDecisionsForLens(tripId: string): Promise<DecisionLensRow[]> {
  const user = await authUser();
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");
  const rows = await db.query.decisions.findMany({
    where: eq(decisions.tripId, tripId),
    orderBy: [desc(decisions.createdAt)],
  });
  return rows.map((d) => {
    const votes = (d.votes ?? {}) as VoteMap;
    const snap = (d.snapshot ?? {}) as DecisionPlace;
    return {
      meta: {
        decisionId: d.id,
        snapshot: {
          placeId: snap.placeId,
          name: snap.name,
          category: snap.category,
          rating: snap.rating ?? null,
          userRatingsTotal: snap.userRatingsTotal ?? null,
          priceLevel: snap.priceLevel ?? null,
          photoRef: snap.photoRef ?? null,
        },
        proposedDay: d.proposedDay,
        note: null,
        closesAt: d.closesAt ? d.closesAt.toISOString() : null,
      },
      status: d.status,
      needsMyVote: d.status === "open" && !votes[user.id],
      createdAt: d.createdAt.toISOString(),
    };
  });
}

/** Owner/proposer force-resolves (add it / skip it) or cancels. */
export async function resolveDecisionManually(
  decisionId: string,
  outcome: "pass" | "skip" | "cancel",
): Promise<DecisionState> {
  const user = await authUser();
  const decision = await db.query.decisions.findFirst({ where: eq(decisions.id, decisionId) });
  if (!decision) throw new Error("Decision not found");
  const trip = await getTripWithMembership(decision.tripId, user.id);
  if (!trip) throw new Error("Access denied");
  if (!(isOwner(trip, user.id) || decision.proposedBy === user.id)) {
    throw new Error("Only the owner or proposer can resolve this");
  }

  const status = outcome === "pass" ? "passed" : outcome === "skip" ? "failed" : "cancelled";
  await db
    .update(decisions)
    .set({ status, resolvedAt: new Date() })
    .where(eq(decisions.id, decisionId));

  if (outcome !== "cancel") {
    const snap = decision.snapshot as DecisionPlace;
    if (status === "passed") {
      const day = decision.proposedDay ?? format(parseDateOnly(trip.startDate), "yyyy-MM-dd");
      await createItineraryItemFromGooglePlace({ tripId: decision.tripId, dayDate: day, place: snap }).catch(
        () => {},
      );
    }
    await fanoutResolved(trip, user.id, snap.name, status === "passed" ? "added" : "skipped");
  }

  revalidatePath(`/trips/${decision.tripId}/chat`);
  revalidatePath(`/trips/${decision.tripId}/itinerary`);
  revalidatePath(`/trips/${decision.tripId}/decisions`);
  return toState({ ...decision, status }, trip, user.id);
}
