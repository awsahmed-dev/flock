/**
 * B7: shared loader for the Money sub-pages (transactions, breakdown,
 * balances). Same fetch pattern used by the overview, factored here so
 * /trips/[id]/expenses/* don't duplicate the auth + query dance.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getRates } from "@/lib/fx";

export async function loadMoneyPageData(tripId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) redirect("/dashboard");

  const [expenseList, fxRates] = await Promise.all([
    db.query.expenses.findMany({
      where: eq(expenses.tripId, tripId),
      with: {
        payer: true,
        splits: { with: { user: true } },
      },
      orderBy: [desc(expenses.expenseDate)],
    }),
    getRates(trip.currency),
  ]);

  const members = trip.members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
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
  };
}
