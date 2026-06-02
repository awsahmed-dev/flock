/**
 * B13b: in-app notification inbox.
 *
 * Pairs with `lib/notifications.ts` (which handles push delivery) by
 * persisting the same event to a per-user feed. The bell icon in the
 * trip header reads from this, marks-read on view, and links to the
 * relevant page.
 *
 * Recording is fire-and-forget — every caller wraps with .catch() so a
 * DB failure here never breaks the primary user action.
 */

import { db } from "@/lib/db";
import { notifications, tripMembers, profiles } from "@/lib/db/schema";
import { and, eq, isNull, desc, inArray } from "drizzle-orm";

export type NotifKind =
  | "expense_logged"
  | "vote_opened"
  | "vote_closed"
  | "split_settled"
  | "member_joined"
  | "trip_starting_soon";

interface RecordArgs {
  tripId: string;
  kind: NotifKind;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  /** Title + body get stored on the row so the legacy renderer (and
   *  any future digest email) can show the event without re-deriving
   *  copy from the payload. */
  title: string;
  body: string;
  /** Recipient user ids. We dedupe + filter the actor out here so
   *  callers don't have to think about it. Pass `null` for trip-wide
   *  fan-out (will be expanded to all members of `tripId`). */
  recipients: string[] | null;
}

/**
 * Insert one event into every recipient's inbox. Always succeeds (or
 * silently no-ops) — never throw upstream.
 */
export async function recordEvent(args: RecordArgs): Promise<void> {
  try {
    let userIds: string[] = [];
    if (args.recipients === null) {
      const members = await db
        .select({ userId: tripMembers.userId })
        .from(tripMembers)
        .where(eq(tripMembers.tripId, args.tripId));
      userIds = members.map((m) => m.userId);
    } else {
      userIds = args.recipients;
    }
    // Filter the actor + dedupe.
    const uniq = [
      ...new Set(userIds.filter((u) => u !== args.actorUserId)),
    ];
    if (uniq.length === 0) return;

    // B13c: respect per-user `notif_inapp` opt-out. One short query —
    // we'd rather skip an insert than push to someone who muted us.
    const profilesRows = await db
      .select({ id: profiles.id, notifInapp: profiles.notifInapp })
      .from(profiles)
      .where(inArray(profiles.id, uniq));
    const optedIn = profilesRows
      .filter((p) => p.notifInapp)
      .map((p) => p.id);
    if (optedIn.length === 0) return;

    await db.insert(notifications).values(
      optedIn.map((userId) => ({
        userId,
        tripId: args.tripId,
        type: args.kind,
        title: args.title,
        body: args.body,
        actorUserId: args.actorUserId,
        payload: args.payload,
        read: false,
      })),
    );
  } catch (err) {
    // Best-effort — log but never bubble up.
    console.error("[inbox] recordEvent failed:", err);
  }
}

export interface InboxRow {
  id: string;
  tripId: string;
  kind: string;
  title: string | null;
  body: string | null;
  payload: unknown;
  actorUserId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Most recent N events for a user. Used by the bell dropdown. Read
 * + unread mixed; the renderer styles unread differently.
 */
export async function recentForUser(
  userId: string,
  limit = 20,
): Promise<InboxRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      tripId: notifications.tripId,
      kind: notifications.type,
      title: notifications.title,
      body: notifications.body,
      payload: notifications.payload,
      actorUserId: notifications.actorUserId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows;
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return rows.length;
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date(), read: true })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(notifications)
    .set({ readAt: new Date(), read: true })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, ids),
      ),
    );
}
