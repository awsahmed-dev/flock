"use server";

import { db } from "@/lib/db";
import { threads, threadComments } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { revalidatePath } from "next/cache";

/**
 * Phase 6 §4-C — contextual threads. One thread per (trip, entity), lazily
 * created on first open; comments are plain rows with emoji tapbacks.
 */
export type ThreadEntityType = "place" | "stop" | "expense" | "day" | "poll";

export async function getThread(
  tripId: string,
  entityType: ThreadEntityType,
  entityId: string,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  let thread = await db.query.threads.findFirst({
    where: and(
      eq(threads.tripId, tripId),
      eq(threads.entityType, entityType),
      eq(threads.entityId, entityId),
    ),
  });
  if (!thread) {
    const [created] = await db
      .insert(threads)
      .values({ tripId, entityType, entityId })
      .onConflictDoNothing()
      .returning();
    thread =
      created ??
      (await db.query.threads.findFirst({
        where: and(
          eq(threads.tripId, tripId),
          eq(threads.entityType, entityType),
          eq(threads.entityId, entityId),
        ),
      }))!;
  }

  const comments = await db.query.threadComments.findMany({
    where: eq(threadComments.threadId, thread.id),
    with: { user: true },
    orderBy: [asc(threadComments.createdAt)],
  });

  return {
    threadId: thread.id,
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      tapbacks: (c.tapbacks ?? {}) as Record<string, string[]>,
      createdAt: c.createdAt?.toISOString() ?? new Date().toISOString(),
      userId: c.userId,
      authorName: c.user?.displayName ?? "Someone",
      authorAvatar: c.user?.avatarUrl ?? null,
    })),
  };
}

export async function addThreadComment(tripId: string, threadId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");
  const body = content.trim();
  if (!body) return null;

  const [row] = await db
    .insert(threadComments)
    .values({ threadId, userId: user.id, content: body })
    .returning();
  revalidatePath(`/trips/${tripId}/huddle`);
  return { id: row.id, createdAt: row.createdAt?.toISOString() ?? new Date().toISOString() };
}

/** Long-press tapback: toggle one of the 5 emoji on a comment. */
export async function toggleTapback(tripId: string, commentId: string, emoji: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Access denied");

  const comment = await db.query.threadComments.findFirst({
    where: eq(threadComments.id, commentId),
  });
  if (!comment) return;
  const tapbacks = { ...((comment.tapbacks ?? {}) as Record<string, string[]>) };
  const list = tapbacks[emoji] ?? [];
  tapbacks[emoji] = list.includes(user.id) ? list.filter((u) => u !== user.id) : [...list, user.id];
  if (tapbacks[emoji].length === 0) delete tapbacks[emoji];

  await db.update(threadComments).set({ tapbacks }).where(eq(threadComments.id, commentId));
}

/** §4-C: comment counts for the 💬 chips on itinerary rows. */
export async function getThreadCounts(tripId: string, entityType: ThreadEntityType) {
  const rows = await db
    .select({
      entityId: threads.entityId,
      threadId: threads.id,
    })
    .from(threads)
    .where(and(eq(threads.tripId, tripId), eq(threads.entityType, entityType)));
  if (!rows.length) return {};
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const list = await db
      .select({ id: threadComments.id })
      .from(threadComments)
      .where(eq(threadComments.threadId, r.threadId));
    if (list.length) counts[r.entityId] = list.length;
  }
  return counts;
}
