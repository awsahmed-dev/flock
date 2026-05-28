export const dynamic = "force-dynamic";

import { BreakdownPage } from "@/components/expenses/breakdown-page";
import { loadMoneyPageData } from "@/lib/actions/money-page-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MoneyBreakdownRoute({ params }: Props) {
  const { id } = await params;
  const { trip, expenseList, fxRates } = await loadMoneyPageData(id);

  return (
    <BreakdownPage
      tripId={id}
      currency={trip.currency}
      expenses={expenseList as any}
      fxRates={fxRates}
    />
  );
}
