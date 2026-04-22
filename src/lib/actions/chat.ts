"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import {
  chatMessages,
  messageReactions,
  profiles,
  votes,
  voteOptions,
  expenses,
  expenseSplits,
  itineraryItems,
  tripMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";
import { detectSiteType, extractUrls, parseExpenseArgs } from "@/lib/chat-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LinkCardMeta = {
  url: string;
  siteType: "hotel" | "flight" | "maps" | "restaurant" | "activity" | "docs" | "other";
  siteName: string;
  confirmedAction?: "itinerary" | "vote" | "document";
  linkedId?: string; // id of the created itinerary item / vote
};

export type ExpenseCardMeta = {
  amount: number;
  category: string;
  description: string;
  confirmedExpenseId?: string;
};

export type VoteCardMeta = {
  question: string;
  options: string[];
  voteId?: string;
};

export type ItineraryCardMeta = {
  title: string;
  type: string;
  dayDate: string;
  itineraryItemId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthedMember(tripId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  return { user, trip };
}

async function ensureProfile(user: { id: string; email?: string; user_metadata?: any }) {
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Traveler",
      email: user.email,
    })
    .onConflictDoNothing();
}

// Parse slash commands from message body
function parseSlashCommand(body: string): {
  type: "expense" | "vote" | "add" | null;
  args: string;
} {
  const lower = body.trim().toLowerCase();
  if (lower.startsWith("/expense ") || lower.startsWith("/exp ")) {
    const args = body.trim().replace(/^\/exp(?:ense)?\s+/i, "");
    return { type: "expense", args };
  }
  if (lower.startsWith("/vote ")) {
    const args = body.trim().replace(/^\/vote\s+/i, "");
    return { type: "vote", args };
  }
  if (lower.startsWith("/add ")) {
    const args = body.trim().replace(/^\/add\s+/i, "");
    return { type: "add", args };
  }
  return { type: null, args: "" };
}

// ─── Send message ─────────────────────────────────────────────────────────────

export async function sendMessage(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const body = (formData.get("body") as string)?.trim();
  const replyToId = (formData.get("replyToId") as string) || null;

  if (!body) return;

  const { user } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const slash = parseSlashCommand(body);

  if (slash.type === "expense") {
    // Post expense card (unconfirmed)
    const meta = parseExpenseArgs(slash.args);
    await db.insert(chatMessages).values({
      tripId,
      userId: user.id,
      type: "expense_card",
      body: null,
      metadata: meta,
      replyToId,
    });
  } else if (slash.type === "vote") {
    // Post vote card (unconfirmed)
    const meta: VoteCardMeta = { question: slash.args, options: [] };
    await db.insert(chatMessages).values({
      tripId,
      userId: user.id,
      type: "vote_card",
      body: null,
      metadata: meta,
      replyToId,
    });
  } else if (slash.type === "add") {
    // Post itinerary card (unconfirmed)
    const meta: ItineraryCardMeta = {
      title: slash.args,
      type: "activity",
      dayDate: "",
    };
    await db.insert(chatMessages).values({
      tripId,
      userId: user.id,
      type: "itinerary_card",
      body: null,
      metadata: meta,
      replyToId,
    });
  } else {
    // Check for URLs to auto-convert
    const urls = extractUrls(body);
    if (urls.length > 0) {
      const url = urls[0];
      const { siteType, siteName } = detectSiteType(url);
      const meta: LinkCardMeta = { url, siteType, siteName };
      // Post text message + link card
      await db.insert(chatMessages).values([
        ...(body.replace(url, "").trim()
          ? [{
              tripId,
              userId: user.id,
              type: "text" as const,
              body: body.replace(url, "").trim(),
              replyToId,
            }]
          : []),
        {
          tripId,
          userId: user.id,
          type: "link_card" as const,
          body: null,
          metadata: meta,
          replyToId,
        },
      ]);
    } else {
      // Plain text
      await db.insert(chatMessages).values({
        tripId,
        userId: user.id,
        type: "text",
        body,
        replyToId,
      });
    }
  }

  revalidatePath(`/trips/${tripId}/chat`);
}

// ─── Delete message (soft) ────────────────────────────────────────────────────

export async function deleteMessage(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;

  const { user, trip } = await getAuthedMember(tripId);

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message) throw new Error("Message not found");

  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");
  if (message.userId !== user.id && !isOwner) {
    throw new Error("Not authorized to delete this message");
  }

  await db
    .update(chatMessages)
    .set({ deletedAt: new Date(), body: null, metadata: null })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
}

// ─── Toggle reaction ──────────────────────────────────────────────────────────

export async function toggleReaction(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;
  const emoji = formData.get("emoji") as string;

  const { user } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const existing = await db.query.messageReactions.findFirst({
    where: and(
      eq(messageReactions.messageId, messageId),
      eq(messageReactions.userId, user.id),
      eq(messageReactions.emoji, emoji)
    ),
  });

  if (existing) {
    await db.delete(messageReactions).where(eq(messageReactions.id, existing.id));
  } else {
    await db.insert(messageReactions).values({ messageId, userId: user.id, emoji });
  }

  revalidatePath(`/trips/${tripId}/chat`);
}

// ─── Pin / unpin message ──────────────────────────────────────────────────────

export async function togglePin(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;

  const { user, trip } = await getAuthedMember(tripId);
  const isOwner = trip.members.some((m) => m.userId === user.id && m.role === "owner");
  if (!isOwner) throw new Error("Only trip owners can pin messages");

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message) throw new Error("Message not found");

  await db
    .update(chatMessages)
    .set({ pinned: !message.pinned })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
}

// ─── Confirm expense card → log real expense ──────────────────────────────────

export async function confirmExpenseCard(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;

  const { user } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message || message.type !== "expense_card") throw new Error("Invalid message");

  const meta = message.metadata as ExpenseCardMeta;
  if (meta.confirmedExpenseId) throw new Error("Already confirmed");

  const today = new Date().toISOString().split("T")[0];

  const [expense] = await db
    .insert(expenses)
    .values({
      tripId,
      title: meta.description || "Expense from chat",
      amount: meta.amount,
      currency: "USD",
      paidBy: user.id,
      category: meta.category as any,
      expenseDate: today,
    })
    .returning();

  // Equal split among all members
  const members = await db
    .select()
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));

  if (members.length > 0) {
    const perPerson = meta.amount / members.length;
    await db.insert(expenseSplits).values(
      members.map((m) => ({
        expenseId: expense.id,
        userId: m.userId,
        amountOwed: perPerson,
        settled: m.userId === user.id,
      }))
    );
  }

  // Update card metadata with confirmed id
  await db
    .update(chatMessages)
    .set({ metadata: { ...meta, confirmedExpenseId: expense.id } })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/expenses`);
}

// ─── Confirm vote card → create real vote ─────────────────────────────────────

export async function confirmVoteCard(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;
  const optionsRaw = formData.get("options") as string; // JSON array of strings

  const { user } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message || message.type !== "vote_card") throw new Error("Invalid message");

  const meta = message.metadata as VoteCardMeta;
  if (meta.voteId) throw new Error("Already confirmed");

  const optionLabels: string[] = JSON.parse(optionsRaw);
  if (optionLabels.length < 2) throw new Error("Need at least 2 options");

  const [vote] = await db
    .insert(votes)
    .values({ tripId, question: meta.question, createdBy: user.id })
    .returning();

  await db.insert(voteOptions).values(
    optionLabels.map((label, i) => ({ voteId: vote.id, label, sortOrder: i }))
  );

  await db
    .update(chatMessages)
    .set({ metadata: { ...meta, options: optionLabels, voteId: vote.id } })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);
}

// ─── Confirm link → add to itinerary ─────────────────────────────────────────

export async function confirmLinkToItinerary(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;
  const title = formData.get("title") as string;
  const dayDate = formData.get("dayDate") as string;
  const type = (formData.get("itemType") as string) || "activity";

  const { user, trip } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message || message.type !== "link_card") throw new Error("Invalid message");

  const meta = message.metadata as LinkCardMeta;

  const [item] = await db
    .insert(itineraryItems)
    .values({
      tripId,
      dayDate: dayDate || trip.startDate,
      title,
      type: type as any,
      bookingUrl: meta.url,
      createdBy: user.id,
      sortOrder: 0,
    })
    .returning();

  await db
    .update(chatMessages)
    .set({ metadata: { ...meta, confirmedAction: "itinerary", linkedId: item.id } })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/itinerary`);
}

// ─── Confirm link → start vote ────────────────────────────────────────────────

export async function confirmLinkToVote(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const messageId = formData.get("messageId") as string;
  const question = formData.get("question") as string;

  const { user } = await getAuthedMember(tripId);
  await ensureProfile(user as any);

  const message = await db.query.chatMessages.findFirst({
    where: eq(chatMessages.id, messageId),
  });
  if (!message || message.type !== "link_card") throw new Error("Invalid message");

  const meta = message.metadata as LinkCardMeta;

  const [vote] = await db
    .insert(votes)
    .values({ tripId, question, createdBy: user.id })
    .returning();

  await db.insert(voteOptions).values([
    { voteId: vote.id, label: meta.siteName, sortOrder: 0 },
  ]);

  await db
    .update(chatMessages)
    .set({ metadata: { ...meta, confirmedAction: "vote", linkedId: vote.id } })
    .where(eq(chatMessages.id, messageId));

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);
}
