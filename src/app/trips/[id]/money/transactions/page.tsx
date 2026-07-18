export const dynamic = "force-dynamic";

import { TransactionsPage } from "@/components/expenses/transactions-page";
import { loadMoneyPageData } from "@/lib/actions/money-page-data";
import { effectiveTripBudget } from "@/lib/budget";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §8-C: transactions live under /money now. */
export default async function MoneyTransactionsRoute({ params }: Props) {
  const { id } = await params;
  const { user, trip, expenseList, fxRates, members, personalBudget } = await loadMoneyPageData(id);

  return (
    <TransactionsPage
      tripId={id}
      userId={user.id}
      currency={trip.currency}
      destination={trip.destination}
      tripBudget={effectiveTripBudget(trip.budgetTotal, (trip as { budgetType?: string }).budgetType, members.length)}
      personalBudget={personalBudget}
      expenses={expenseList as any}
      members={members}
      fxRates={fxRates}
      startDate={trip.startDate}
      endDate={trip.endDate}
    />
  );
}
