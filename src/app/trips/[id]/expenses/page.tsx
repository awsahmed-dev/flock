export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { TripShell } from "@/components/trips/trip-shell";
import { ExpensesBoard } from "@/components/expenses/expenses-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExpensesPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const expenseList = await db.query.expenses.findMany({
    where: eq(expenses.tripId, id),
    with: {
      payer: true,
      splits: { with: { user: true } },
    },
    orderBy: [desc(expenses.expenseDate)],
  });

  const members = trip.members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
  }));

  return (
    <TripShell trip={trip} userId={user.id}>
      <ExpensesBoard
        tripId={id}
        userId={user.id}
        currency={trip.currency}
        expenses={expenseList as any}
        members={members}
      />
    </TripShell>
  );
}
