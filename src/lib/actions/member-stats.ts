"use server";

import { db } from "@/lib/db";
import {
  itineraryItems,
  expenses,
  expenseSplits,
  packingItems,
  tripMembers,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";

/**
 * B22: cheap roll-up of one trip-member's footprint inside a trip.
 * Powers the crew mini-profile drawer on the trip overview. All queries
 * are single-column-aggregate scans on indexed columns so calling this
 * per row-tap is fine.
 *
 * Returns null when the caller isn't a trip member (auth gate) or when
 * the target user isn't on the trip.
 */
export interface MemberStats {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  joinedAt: string;
  // Activity contributions
  itemsAdded: number;
  // Money
  expensesPaid: number;
  paidTotal: number; // in trip currency, raw (FX conversion happens client-side)
  paidCurrency: string;
  /** What this person owes the GROUP minus what they're owed; positive
   *  = group owes them, negative = they owe the group. */
  netBalance: number | null; // null when not computable
  // Packing
  packingAdded: number;
}

export async function getMemberStats(
  tripId: string,
  memberUserId: string,
): Promise<MemberStats | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) return null;

  const member = trip.members.find((m) => m.userId === memberUserId);
  if (!member) return null;

  const [
    itemsAddedRow,
    expensesPaidRow,
    packingAddedRow,
    splitsOwedRow,
    splitsCreditRow,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(itineraryItems)
      .where(
        and(
          eq(itineraryItems.tripId, tripId),
          eq(itineraryItems.createdBy, memberUserId),
        ),
      ),
    db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(amount), 0)::float`,
      })
      .from(expenses)
      .where(
        and(eq(expenses.tripId, tripId), eq(expenses.paidBy, memberUserId)),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(packingItems)
      .where(
        and(
          eq(packingItems.tripId, tripId),
          eq(packingItems.createdBy, memberUserId),
        ),
      ),
    // Unsettled splits this member owes others
    db
      .select({
        total: sql<number>`coalesce(sum(amount_owed), 0)::float`,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(
        and(
          eq(expenses.tripId, tripId),
          eq(expenseSplits.userId, memberUserId),
          eq(expenseSplits.settled, false),
        ),
      ),
    // Unsettled splits OWED to this member (they paid, others owe them)
    db
      .select({
        total: sql<number>`coalesce(sum(amount_owed), 0)::float`,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(
        and(
          eq(expenses.tripId, tripId),
          eq(expenses.paidBy, memberUserId),
          eq(expenseSplits.settled, false),
        ),
      ),
  ]);

  const memberRow = await db.query.tripMembers.findFirst({
    where: and(
      eq(tripMembers.tripId, tripId),
      eq(tripMembers.userId, memberUserId),
    ),
    columns: { joinedAt: true },
  });

  const owes = splitsOwedRow[0]?.total ?? 0;
  const owed = splitsCreditRow[0]?.total ?? 0;

  return {
    userId: memberUserId,
    displayName: member.displayName,
    role: member.role as "owner" | "member",
    joinedAt: memberRow?.joinedAt?.toISOString() ?? trip.startDate as string,
    itemsAdded: itemsAddedRow[0]?.count ?? 0,
    expensesPaid: expensesPaidRow[0]?.count ?? 0,
    paidTotal: expensesPaidRow[0]?.total ?? 0,
    paidCurrency: trip.currency,
    netBalance: owed - owes,
    packingAdded: packingAddedRow[0]?.count ?? 0,
  };
}
