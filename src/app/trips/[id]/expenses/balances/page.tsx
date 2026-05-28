export const dynamic = "force-dynamic";

import { BalancesPage } from "@/components/expenses/balances-page";
import { loadMoneyPageData } from "@/lib/actions/money-page-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MoneyBalancesRoute({ params }: Props) {
  const { id } = await params;
  const { user, trip, expenseList, fxRates, members } = await loadMoneyPageData(id);

  return (
    <BalancesPage
      tripId={id}
      userId={user.id}
      currency={trip.currency}
      expenses={expenseList as any}
      members={members}
      fxRates={fxRates}
    />
  );
}
