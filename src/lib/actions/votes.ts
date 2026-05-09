"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { votes, voteOptions, voteResponses, profiles, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";

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

  revalidatePath(`/trips/${tripId}/votes`);
  revalidatePath(`/trips/${tripId}`);
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
