"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { votes, voteOptions, voteResponses, profiles, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { sendEmail } from "@/lib/email/send";
import { renderVoteOpened } from "@/lib/email/templates";
import { tripMembers } from "@/lib/db/schema";
import { sendPush } from "@/lib/push/send";
import { recordEvent } from "@/lib/inbox";

async function getAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

// ─── Create vote ─────────────────────────────────────────────────────────────

export async function createVote(formData: FormData) {
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

  const question = formData.get("question") as string;
  const deadlineRaw = formData.get("deadline") as string | null;
  const deadline = deadlineRaw ? new Date(deadlineRaw) : null;

  if (!question?.trim()) throw new Error("Question is required");

  // Parse options — form sends option_label_0, option_label_1 ...
  const optionLabels: string[] = [];
  const optionCosts: (number | null)[] = [];
  let i = 0;
  while (formData.get(`option_label_${i}`) !== null) {
    const label = formData.get(`option_label_${i}`) as string;
    const cost = formData.get(`option_cost_${i}`);
    if (label?.trim()) {
      optionLabels.push(label.trim());
      optionCosts.push(cost ? parseFloat(cost as string) : null);
    }
    i++;
  }

  if (optionLabels.length < 2) throw new Error("At least 2 options are required");
  // Hard cap — anything more than 5 turns into an unreadable list. The dialog
  // already enforces this on the client; this is the belt-and-braces backup.
  const MAX_OPTIONS = 5;
  if (optionLabels.length > MAX_OPTIONS) {
    optionLabels.length = MAX_OPTIONS;
    optionCosts.length = MAX_OPTIONS;
  }

  const [vote] = await db
    .insert(votes)
    .values({
      tripId,
      question: question.trim(),
      deadline,
      createdBy: user.id,
    })
    .returning();

  await db.insert(voteOptions).values(
    optionLabels.map((label, idx) => ({
      voteId: vote.id,
      label,
      costEstimate: optionCosts[idx],
      sortOrder: idx,
    }))
  );

  // Auto-post the vote to chat (mirrors mobile)
  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    body: `📊 New vote: ${question.trim()}`,
    type: "vote_card",
    metadata: {
      voteId: vote.id,
      question: question.trim(),
      options: optionLabels,
    },
  }).catch(() => {});

  // Notify the rest of the crew by email — soft-failing, idempotency-keyed,
  // skipped entirely if RESEND_API_KEY is unset. Author themself is excluded.
  notifyVoteOpened(tripId, vote.id, user.id, question.trim(), optionLabels).catch(
    (e) => console.error("[votes/notify] failed:", e),
  );

  // B13b: in-app inbox row for every other trip member.
  const actorName =
    (user as any).user_metadata?.display_name ||
    (user as any).email?.split("@")[0] ||
    "Someone";
  recordEvent({
    tripId,
    kind: "vote_opened",
    actorUserId: user.id,
    title: `${actorName} opened a vote`,
    body: question.trim(),
    payload: { voteId: vote.id, question: question.trim() },
    recipients: null,
  });

  revalidatePath(`/trips/${tripId}/votes`);
  revalidatePath(`/trips/${tripId}`);
}

async function notifyVoteOpened(
  tripId: string,
  voteId: string,
  authorId: string,
  question: string,
  options: string[],
): Promise<void> {
  const tripRow = await db.query.trips.findFirst({
    where: (t, { eq }) => eq(t.id, tripId),
  });
  if (!tripRow) return;
  const authorRow = await db.query.profiles.findFirst({
    where: (p, { eq }) => eq(p.id, authorId),
  });
  const members = await db
    .select({
      userId: tripMembers.userId,
      displayName: tripMembers.displayName,
    })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));
  const recipientUserIds: string[] = [];
  for (const m of members) {
    if (m.userId === authorId) continue;
    recipientUserIds.push(m.userId);
    const profile = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.id, m.userId),
    });
    if (!profile?.email) continue;
    const rendered = await renderVoteOpened({
      recipientName: m.displayName || "there",
      authorName: authorRow?.displayName ?? "Someone in the crew",
      tripName: tripRow.name,
      question,
      options,
      tripId,
      voteId,
      // B15-f: per-recipient locale from profiles.locale.
      locale: (profile as any).locale === "ar" ? "ar" : "en",
    });
    await sendEmail({
      to: profile.email,
      ...rendered,
      kind: "vote_opened",
    });
  }

  // Web push (silent if VAPID isn't configured). Tag groups multiple votes
  // on the same trip so the latest replaces the older notification.
  await sendPush({
    toUserIds: recipientUserIds,
    payload: {
      title: `🗳️  ${authorRow?.displayName ?? "Someone"} opened a vote`,
      body: question,
      url: `/trips/${tripId}/votes`,
      tag: `vote:${tripId}`,
    },
  });
}

// ─── Cast vote ────────────────────────────────────────────────────────────────

export async function castVote(formData: FormData) {
  const user = await getAuthenticatedUser();
  const voteId = formData.get("voteId") as string;
  const selectedOptionId = formData.get("selectedOptionId") as string;
  const tripId = formData.get("tripId") as string;

  if (!voteId || !selectedOptionId) throw new Error("Missing vote data");

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

  // Upsert: one response per user per vote
  const existing = await db.query.voteResponses.findFirst({
    where: and(
      eq(voteResponses.voteId, voteId),
      eq(voteResponses.userId, user.id)
    ),
  });

  if (existing) {
    await db
      .update(voteResponses)
      .set({ selectedOptionId })
      .where(eq(voteResponses.id, existing.id));
  } else {
    await db.insert(voteResponses).values({
      voteId,
      userId: user.id,
      selectedOptionId,
    });
  }

  revalidatePath(`/trips/${tripId}/votes`);
}

// ─── Close vote ───────────────────────────────────────────────────────────────

export async function closeVote(formData: FormData) {
  const user = await getAuthenticatedUser();
  const voteId = formData.get("voteId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  // Only trip owner or vote creator can close
  const vote = await db.query.votes.findFirst({
    where: eq(votes.id, voteId),
  });
  if (!vote) throw new Error("Vote not found");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );
  if (vote.createdBy !== user.id && !isOwner) {
    throw new Error("Not authorized to close this vote");
  }

  await db
    .update(votes)
    .set({ status: "closed", resolvedAt: new Date() })
    .where(eq(votes.id, voteId));

  // B13c: tell the crew the vote was resolved.
  recordEvent({
    tripId,
    kind: "vote_closed",
    actorUserId: user.id,
    title: `Vote closed: ${vote.question}`,
    body: "Tap to see the result",
    payload: { voteId },
    recipients: null,
  });

  revalidatePath(`/trips/${tripId}/votes`);
}

// ─── Delete vote ──────────────────────────────────────────────────────────────

export async function deleteVote(formData: FormData) {
  const user = await getAuthenticatedUser();
  const voteId = formData.get("voteId") as string;
  const tripId = formData.get("tripId") as string;

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const vote = await db.query.votes.findFirst({
    where: eq(votes.id, voteId),
  });
  if (!vote) throw new Error("Vote not found");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );
  if (vote.createdBy !== user.id && !isOwner) {
    throw new Error("Not authorized to delete this vote");
  }

  await db.delete(votes).where(eq(votes.id, voteId));

  revalidatePath(`/trips/${tripId}/votes`);
}
