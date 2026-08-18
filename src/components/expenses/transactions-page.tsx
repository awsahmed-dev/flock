"use client";

import { useMemo, useState } from "react";
import { createBaseConverter } from "@/lib/money-total";
import { FxIncompleteNote } from "@/components/expenses/fx-incomplete-note";
import { useT } from "@/components/i18n/locale-provider";
import { Receipt, CaretRight as ChevronRight, ArrowsLeftRight as ArrowRightLeft, MagnifyingGlass as Search, Bed, Airplane as Plane, ForkKnife as Utensils, Ticket, ShoppingBag, DotsThree as MoreHorizontal } from "@phosphor-icons/react/dist/ssr";
import { parseISO, eachDayOfInterval, isToday, isFuture } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { fmtAmount as fmt } from "@/lib/numerals";
import { convert, type RateBundle } from "@/lib/fx";
import { ExpenseSheet } from "./expense-sheet";
import { AddExpenseDialog } from "./add-expense-dialog";
import { PageHeader } from "@/components/ui/page-header";

const CATEGORY_CONFIG: Record<
  string,
  { labelKey: string; icon: React.ElementType; bg: string; text: string; dot: string }
> = {
  accommodation: { labelKey: "expenses.catStay", icon: Bed, bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  transport:     { labelKey: "expenses.catTransport", icon: Plane, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  food:          { labelKey: "expenses.catFood", icon: Utensils, bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  activity:      { labelKey: "expenses.catActivity", icon: Ticket, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  shopping:      { labelKey: "expenses.catShopping", icon: ShoppingBag, bg: "bg-pink-100 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  other:         { labelKey: "expenses.catOther", icon: MoreHorizontal, bg: "bg-muted/60", text: "text-muted-foreground", dot: "bg-slate-400" },
};

interface Split {
  id: string;
  userId: string;
  amountOwed: number;
  settled: boolean;
  user?: { displayName: string } | null;
}

interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: string;
  scope: "shared" | "personal";
  receiptUrl?: string | null;
  expenseDate: string;
  notes: string | null;
  createdAt: Date;
  payer?: { displayName: string } | null;
  splits: Split[];
}

interface Props {
  tripId: string;
  userId: string;
  currency: string;
  tripBudget: number | null;
  personalBudget: number | null;
  expenses: Expense[];
  members: { userId: string; displayName: string }[];
  fxRates: RateBundle | null;
  startDate: string;
  endDate: string;
  /** Sprint 9 FIX-2A: destination seeds the expense currency default. */
  destination?: string;
}

/**
 * B7: dedicated activity / transactions page. Reached from the Money
 * overview's "View all" affordance. Folds the daily tracker in as a
 * sub-section here — that's where it belongs per tester feedback (it's
 * a sub-feature of Activity, not a top-level item).
 */
export function TransactionsPage({
  tripId,
  userId,
  currency,
  tripBudget,
  personalBudget,
  expenses: expenseList,
  members,
  fxRates,
  startDate,
  destination = "",
  endDate,
}: Props) {
  const t = useT();
  const isOwner = members.some((m) => m.userId === userId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = openId ? expenseList.find((e) => e.id === openId) ?? null : null;

  const derived = useMemo(() => {
    const sharedExpenses = expenseList.filter((e) => e.scope !== "personal");

    // A missing rate no longer silently counts a row as zero — the row is
    // still excluded from the arithmetic, but recorded so the UI can say so.
    const { toBase, missing } = createBaseConverter(currency, fxRates);

    const totalSharedBase = sharedExpenses.reduce(
      (s, e) => s + toBase(e.amount, e.currency),
      0,
    );

    const personalExpenses = expenseList.filter((e) => e.scope === "personal");
    const myPersonalBase = personalExpenses
      .filter((e) => e.paidBy === userId)
      .reduce((s, e) => s + toBase(e.amount, e.currency), 0);
    const mySharedShareBase = sharedExpenses.reduce((s, e) => {
      const sp = e.splits.find((x) => x.userId === userId);
      return s + (sp ? toBase(sp.amountOwed, e.currency) : 0);
    }, 0);

    // Daily breakdown for the tracker
    const sharedByDay = new Map<string, number>();
    for (const e of sharedExpenses) {
      sharedByDay.set(e.expenseDate, (sharedByDay.get(e.expenseDate) ?? 0) + toBase(e.amount, e.currency));
    }
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const dailyBreakdown = days.map((d, idx) => {
      const key = format(d, "yyyy-MM-dd");
      return {
        date: d,
        dateKey: key,
        dayNumber: idx + 1,
        spent: sharedByDay.get(key) ?? 0,
      };
    });

    return {
      fxMissing: [...missing],
      totalSharedBase,
      personalSpentBase: myPersonalBase + mySharedShareBase,
      dailyBreakdown,
    };
  }, [expenseList, currency, fxRates, userId, startDate, endDate]);

  const dailyTarget =
    tripBudget && derived.dailyBreakdown.length > 0
      ? tripBudget / derived.dailyBreakdown.length
      : null;

  // Filter + sort transactions for the list
  const filtered = expenseList
    .filter((e) =>
      query.trim().length === 0
        ? true
        : (e.title + " " + (e.notes ?? "") + " " + (e.payer?.displayName ?? "")).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());



  const baseAmountFor = (e: Expense) =>
    e.currency === currency ? null : convert(e.amount, e.currency, currency, fxRates);

  // B9: index filtered transactions by date for fast per-day lookup in
  // the unified timeline below.
  const txByDay = useMemo(() => {
    const m = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = m.get(e.expenseDate) ?? [];
      arr.push(e);
      m.set(e.expenseDate, arr);
    }
    return m;
  }, [filtered]);

  // §7-A: only render days that actually have expenses. The previous version
  // showed every day in the trip span, so a 15-day trip with 2 spend days
  // buried the real rows under 13 "No spend logged" noise rows.
  const isSearching = query.trim().length > 0;
  const daysToRender = derived.dailyBreakdown.filter(
    (d) => (txByDay.get(d.dateKey) ?? []).length > 0,
  );

  // Expenses dated OUTSIDE the trip span (logged before departure, or the
  // trip dates changed after logging) get their own buckets — otherwise
  // they exist on the Money overview but vanish from this page entirely.
  const outOfRangeDays = useMemo(() => {
    const tripKeys = new Set(derived.dailyBreakdown.map((d) => d.dateKey));
    return Array.from(txByDay.keys())
      .filter((k) => !tripKeys.has(k))
      .sort((a, b) => (a < b ? 1 : -1));
  }, [txByDay, derived.dailyBreakdown]);

  return (
    <div className="space-y-4">
      <PageHeader
        backHref={`/trips/${tripId}/money`}
        title={t("expenses.activity")}
        subtitle={
          dailyTarget
            ? t("expenses.txSubtitle", { count: expenseList.length, target: `${currency} ${fmt(dailyTarget)}` })
            : t("expenses.txCount", { count: expenseList.length })
        }
      />
      <FxIncompleteNote currencies={derived.fxMissing} className="-mt-2" />

      {/* ── Search + add ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("expenses.searchTransactions")}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
        <AddExpenseDialog
          tripId={tripId}
          destination={destination}
          baseCurrency={currency}
          tripBudget={tripBudget}
          sharedSpent={derived.totalSharedBase}
          personalBudget={personalBudget}
          personalSpent={derived.personalSpentBase}
          memberCount={Math.max(1, members.length)}
          members={members}
          currentUserId={userId}
          fxRates={fxRates}
        />
      </div>

      {/* ── B9: unified per-day timeline. Daily tracker is no longer a
          separate card above the list — instead, each day's progress
          bar lives as the section header for that day's transactions.
          Days with no transactions still render (when not searching) so
          the user sees the trip's pace at a glance. */}
      {daysToRender.length === 0 && outOfRangeDays.length === 0 ? (
        isSearching ? (
          <p className="text-xs text-muted-foreground text-center py-10">
            {t("expenses.noMatches", { query })}
          </p>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold mb-1">{t("expenses.noExpensesYet")}</p>
            <p className="text-xs text-muted-foreground">
              {t("expenses.logFirstExpense")}
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {outOfRangeDays.map((key) => (
            <section
              key={key}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <p className="text-xs font-bold">
                  {format(parseISO(key), "EEE, MMM d")}
                </p>
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                  {t("expenses.outsideTripDays")}
                </span>
              </div>
              <ul className="divide-y divide-border/60 border-t border-border/40 px-2">
                {(txByDay.get(key) ?? []).map((exp) => (
                  <SlimRow
                    key={exp.id}
                    expense={exp}
                    userId={userId}
                    baseCurrency={currency}
                    baseAmount={baseAmountFor(exp)}
                    onClick={() => setOpenId(exp.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {daysToRender.map((d) => {
            const dayTxs = txByDay.get(d.dateKey) ?? [];
            const pct =
              dailyTarget && dailyTarget > 0 ? (d.spent / dailyTarget) * 100 : 0;
            const tone =
              pct >= 100
                ? "bg-red-500"
                : pct >= 90
                  ? "bg-orange-500"
                  : pct >= 75
                    ? "bg-amber-500"
                    : "bg-emerald-500";
            const today = isToday(d.date);
            const isFutureDay = isFuture(d.date);

            return (
              <section
                key={d.dateKey}
                className={`rounded-2xl border bg-card overflow-hidden ${
                  today
                    ? "border-primary/40 shadow-sm shadow-primary/10"
                    : "border-border/60"
                }`}
              >
                {/* Day header — replaces the standalone Daily tracker row */}
                <div
                  className={`flex items-center gap-3 px-3.5 py-2.5 ${
                    today ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60"
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase leading-none ${
                        today ? "" : "text-muted-foreground"
                      }`}
                    >
                      {t("expenses.dayBadge")}
                    </span>
                    <span className="text-sm font-bold leading-tight tabular-nums">
                      {d.dayNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold inline-flex items-center gap-1.5">
                        {today ? t("nav.today") : format(d.date, "EEE, MMM d")}
                        {today && (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                            {t("expenses.liveBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-bold tabular-nums text-right">
                        {currency} {fmt(d.spent)}
                        {dailyTarget && (
                          <span className="text-muted-foreground font-medium ms-1">
                            / {fmt(dailyTarget)}
                          </span>
                        )}
                      </p>
                    </div>
                    {dailyTarget ? (
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full me-auto rounded-full ${tone}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Day transactions — listed inline under the progress bar.
                    Empty days keep the header but show a tiny placeholder
                    so the timeline stays continuous. */}
                {dayTxs.length > 0 ? (
                  <ul className="divide-y divide-border/60 border-t border-border/40 px-2">
                    {dayTxs.map((exp) => (
                      <SlimRow
                        key={exp.id}
                        expense={exp}
                        userId={userId}
                        baseCurrency={currency}
                        baseAmount={baseAmountFor(exp)}
                        onClick={() => setOpenId(exp.id)}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground italic">
                    {isFutureDay ? t("expenses.upcomingDay") : t("expenses.noSpendLogged")}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <ExpenseSheet
        expense={selected}
        open={openId !== null}
        onClose={() => setOpenId(null)}
        userId={userId}
        isOwner={isOwner}
        baseAmount={selected ? baseAmountFor(selected) : null}
        baseCurrency={currency}
      />
    </div>
  );
}

/* ─── Shared bits for the sub-pages ──────────────────────────────────── */

function SlimRow({
  expense,
  userId,
  baseCurrency,
  baseAmount,
  onClick,
}: {
  expense: Expense;
  userId: string;
  baseCurrency: string;
  baseAmount: number | null;
  onClick: () => void;
}) {
  const t = useT();
  const cat = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.other;
  const CatIcon = cat.icon;
  const isPayer = expense.paidBy === userId;
  const payerName = isPayer ? t("expenses.payerYou") : (expense.payer?.displayName ?? t("expenses.payerSomeone"));
  const mySplit = expense.splits.find((s) => s.userId === userId);
  const iOwe = !isPayer && mySplit && !mySplit.settled;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-accent/30 transition-colors -mx-2 px-2 rounded-lg"
      >
        <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
          <CatIcon className={`w-4 h-4 ${cat.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{expense.title}</p>
          <p className="text-[12px] text-muted-foreground truncate">
            {payerName}
            {iOwe && (
              <span className="ms-1.5 text-orange-600 dark:text-orange-400 font-semibold">
                {t("expenses.youOweShort", { amount: `${expense.currency} ${fmt(mySplit!.amountOwed)}` })}
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">
            {expense.currency} {fmt(expense.amount)}
          </p>
          {baseAmount !== null && (
            <p className="text-[10px] text-muted-foreground tabular-nums inline-flex items-center gap-0.5">
              <ArrowRightLeft className="w-2 h-2" /> {baseCurrency} {fmt(baseAmount)}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
      </button>
    </li>
  );
}
