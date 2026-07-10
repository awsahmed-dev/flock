/**
 * B7: shared loader for the Money sub-pages (transactions, breakdown,
 * balances). Same fetch pattern used by the overview, factored here so
 * /trips/[id]/expenses/* don't duplicate the auth + query dance.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { expenses, settlements } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getRates } from "@/lib/fx";

export async function loadMoneyPageData(tripId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) redirect("/dashboard");

  const [expenseList, fxRates, settlementRows] = await Promise.all([
    db.query.expenses.findMany({
      where: eq(expenses.tripId, tripId),
      with: {
        payer: true,
        splits: { with: { user: true } },
      },
      orderBy: [desc(expenses.expenseDate)],
    }),
    getRates(trip.currency),
    // Phase 6 §8-A: recorded settlements reduce the live balances.
    db.select().from(settlements).where(eq(settlements.tripId, tripId)),
  ]);

  const members = trip.members.map((m) => ({
    userId: m.userId,
    // §10.3: live profile name over the join-time cached copy.
    displayName: m.user?.displayName || m.displayName,
    // B19: thread the joined profile's avatar so expense balance rows +
    // money page chips show the real photo.
    avatarUrl: m.user?.avatarUrl ?? null,
  }));

  const myMembership = trip.members.find((m) => m.userId === user.id);
  const personalBudget = myMembership?.personalBudget ?? null;

  return {
    user,
    trip,
    expenseList,
    fxRates,
    members,
    personalBudget,
    settlements: settlementRows.map((s) => ({
      creditorId: s.creditorId,
      debtorId: s.debtorId,
      amount: s.amount != null ? Number(s.amount) : 0,
    })),
  };
}
