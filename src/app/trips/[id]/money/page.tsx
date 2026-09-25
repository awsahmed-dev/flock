export const dynamic = "force-dynamic";

import { ExpensesBoard } from "@/components/expenses/expenses-board";
import { loadMoneyPageData } from "@/lib/actions/money-page-data";
import { effectiveTripBudget } from "@/lib/budget";
import { getToday } from "@/lib/today-server";
import { listOutsidePeople } from "@/lib/actions/outside-people";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Phase 6 §8: /money is the canonical money route. The /expenses and
 * /wallet era routes redirect here.
 */
export default async function MoneyPage({ params }: Props) {
  const { id } = await params;
  const [{ user, trip, expenseList, fxRates, members, personalBudget, settlements }, todayIso, outside] = await Promise.all([
    loadMoneyPageData(id),
    getToday(),
    // Private to the viewer: only their own people outside the trip.
    listOutsidePeople(id),
  ]);

  // Phase 7 §6-C: the Expenses/Bookings/Pack sub-tab bar is gone — Money is
  // one page; Pack lives in Huddle (§7). §6-A: 16px side padding everywhere.
  return (
    <div className="px-4 pt-4 max-w-3xl mx-auto">
      <ExpensesBoard
        tripId={id}
        userId={user.id}
        currency={trip.currency}
        destination={trip.destination}
        // QA BUG-11: per-person budgets multiply by crew size.
        tripBudget={effectiveTripBudget(trip.budgetTotal, (trip as { budgetType?: string }).budgetType, members.length)}
        personalBudget={personalBudget}
        expenses={expenseList as any}
        members={members}
        fxRates={fxRates}
        startDate={trip.startDate}
        endDate={trip.endDate}
        settlements={settlements}
        todayIso={todayIso}
        outside={outside}
      />
    </div>
  );
}
