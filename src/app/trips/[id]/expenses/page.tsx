export const dynamic = "force-dynamic";

import { ExpensesBoard } from "@/components/expenses/expenses-board";
import { ManageTabs } from "@/components/trips/manage-tabs";
import { loadMoneyPageData } from "@/lib/actions/money-page-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ExpensesPage({ params }: Props) {
  const { id } = await params;
  const { user, trip, expenseList, fxRates, members, personalBudget } = await loadMoneyPageData(id);

  return (
    <>
      <ManageTabs tripId={id} active="expenses" />
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
    </>
  );
}
