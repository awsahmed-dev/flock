export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExpensesBoard } from "@/components/expenses/expenses-board";
import { getRates } from "@/lib/fx";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExpensesPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  // Parallel: expenses + FX rates. FX is keyed by trip's base currency so
  // a USD trip with EUR/AED expenses lands every conversion against USD.
  const [expenseList, fxRates] = await Promise.all([
    db.query.expenses.findMany({
      where: eq(expenses.tripId, id),
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

  // B2 Budget v2 — pull current user's personal budget cap to thread into
  // the budget-health card. NULL when they haven't set one.
  const myMembership = trip.members.find((m) => m.userId === user.id);
  const personalBudget = myMembership?.personalBudget ?? null;

  return (
    <ExpensesBoard
      tripId={id}
      userId={user.id}
      currency={trip.currency}
      tripBudget={trip.budgetTotal ?? null}
      personalBudget={personalBudget}
      expenses={expenseList as any}
      members={members}
      fxRates={fxRates}
      startDate={trip.startDate}
      endDate={trip.endDate}
    />
  );
}
