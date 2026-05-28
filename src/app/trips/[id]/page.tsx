export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripOverview } from "@/components/trips/trip-overview";
import { getBaseUrl } from "@/lib/base-url";
import { db } from "@/lib/db";
import {
  itineraryItems,
  votes,
  expenses,
  expenseSplits,
  packingItems,
  documents,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ActionHubStats } from "@/components/trips/trip-action-hub";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const invite = trip.invites[0];
  const inviteUrl = invite ? `${getBaseUrl()}/invite/${invite.token}` : null;

  // ── Action-hub stats: run in parallel so the dashboard composes from a
  // single fast batch. None of these are heavy — all single-table scans on
  // an indexed trip_id.
  const [itineraryRows, voteRows, expenseRows, splitRows, packingRows, docRows] =
    await Promise.all([
      db.query.itineraryItems.findMany({
        where: eq(itineraryItems.tripId, id),
        columns: { dayDate: true },
      }),
      db.query.votes.findMany({
        where: eq(votes.tripId, id),
        columns: { status: true },
      }),
      db.query.expenses.findMany({
        where: eq(expenses.tripId, id),
        columns: { amount: true, scope: true },
      }),
      db.query.expenseSplits.findMany({
        where: and(eq(expenseSplits.userId, user.id), eq(expenseSplits.settled, false)),
        columns: { amountOwed: true, expenseId: true },
        with: { expense: { columns: { tripId: true, paidBy: true } } },
      }),
      db.query.packingItems.findMany({
        where: eq(packingItems.tripId, id),
        columns: { packed: true },
      }),
      db.query.documents.findMany({
        where: eq(documents.tripId, id),
        columns: { id: true },
      }),
    ]);

  const totalDays =
    differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
  const daysWithItems = new Set(itineraryRows.map((r) => r.dayDate)).size;

  const sharedExpenses = expenseRows.filter((e) => e.scope === "shared");
  const totalSpent = sharedExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  // Filter splits to this trip's expenses + exclude rows where the user is
  // also the payer (their own splits don't count as "owed").
  const myUnsettled = splitRows
    .filter((s) => s.expense?.tripId === id && s.expense?.paidBy !== user.id)
    .reduce((sum, s) => sum + (s.amountOwed ?? 0), 0);

  const stats: ActionHubStats = {
    itineraryCount: itineraryRows.length,
    daysWithItems,
    totalDays: Math.max(1, totalDays),
    votesOpen: voteRows.filter((v) => v.status === "open").length,
    votesResolved: voteRows.filter((v) => v.status === "closed").length,
    expensesCount: expenseRows.length,
    currency: trip.currency,
    totalSpent,
    myUnsettled,
    packingPacked: packingRows.filter((p) => p.packed).length,
    packingTotal: packingRows.length,
    documentsCount: docRows.length,
  };

  return (
    <TripOverview
      trip={trip}
      inviteUrl={inviteUrl}
      userId={user.id}
      stats={stats}
    />
  );
}
