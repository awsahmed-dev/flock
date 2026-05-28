"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Receipt, ChevronLeft, ChevronRight, ArrowRightLeft, Calendar, Search,
  Bed, Plane, Utensils, Ticket, ShoppingBag, MoreHorizontal,
} from "lucide-react";
import { format, parseISO, eachDayOfInterval, isToday, isFuture } from "date-fns";
import { fmtAmount as fmt } from "@/lib/numerals";
import { convert, type RateBundle } from "@/lib/fx";
import { ExpenseSheet } from "./expense-sheet";
import { AddExpenseDialog } from "./add-expense-dialog";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; dot: string }
> = {
  accommodation: { label: "Stay", icon: Bed, bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  transport:     { label: "Transport", icon: Plane, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  food:          { label: "Food", icon: Utensils, bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  activity:      { label: "Activity", icon: Ticket, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  shopping:      { label: "Shopping", icon: ShoppingBag, bg: "bg-pink-100 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  other:         { label: "Other", icon: MoreHorizontal, bg: "bg-muted/60", text: "text-muted-foreground", dot: "bg-slate-400" },
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
  endDate,
}: Props) {
  const isOwner = members.some((m) => m.userId === userId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = openId ? expenseList.find((e) => e.id === openId) ?? null : null;

  const derived = useMemo(() => {
    const sharedExpenses = expenseList.filter((e) => e.scope !== "personal");

    function toBase(amount: number, ccy: string) {
      if (ccy === currency) return amount;
      const c = convert(amount, ccy, currency, fxRates);
      return c ?? 0;
    }

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

  // Group filtered by date
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const arr = map.get(e.expenseDate) ?? [];
      arr.push(e);
      map.set(e.expenseDate, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [filtered]);

  const baseAmountFor = (e: Expense) =>
    e.currency === currency ? null : convert(e.amount, e.currency, currency, fxRates);

  return (
    <div className="space-y-5">
      <Header tripId={tripId} title="Activity" subtitle={`${expenseList.length} transactions`} />

      {/* ── Daily tracker (sub-feature of Activity per tester ask) ── */}
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Daily tracker
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {dailyTarget
                ? `Target ${currency} ${fmt(dailyTarget)}/day`
                : "Set a trip budget for daily targets"}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-border/60">
          {derived.dailyBreakdown.map((d) => {
            const pct = dailyTarget && dailyTarget > 0 ? (d.spent / dailyTarget) * 100 : 0;
            const tone = pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-orange-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <li key={d.dateKey} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-muted/60 shrink-0">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground leading-none">
                    Day
                  </span>
                  <span className="text-sm font-bold leading-tight tabular-nums">{d.dayNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold truncate">
                      {isToday(d.date) ? "Today" : format(d.date, "EEE MMM d")}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-right">
                      {currency} {fmt(d.spent)}
                      {dailyTarget && (
                        <span className="text-muted-foreground font-medium ml-1">
                          / {fmt(dailyTarget)}
                        </span>
                      )}
                    </p>
                  </div>
                  {dailyTarget ? (
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {d.spent > 0 ? "Logged today" : isFuture(d.date) ? "Upcoming" : "Nothing logged"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Search + add ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
          />
        </div>
        <AddExpenseDialog
          tripId={tripId}
          baseCurrency={currency}
          tripBudget={tripBudget}
          sharedSpent={derived.totalSharedBase}
          personalBudget={personalBudget}
          personalSpent={derived.personalSpentBase}
          memberCount={Math.max(1, members.length)}
        />
      </div>

      {/* ── Grouped-by-day transactions list ───────────────────────── */}
      {expenseList.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold mb-1">No transactions yet</p>
          <p className="text-xs text-muted-foreground">
            Log your first expense to see it here.
          </p>
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-10">
          No matches for "{query}".
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, exps]) => (
            <section key={date} className="rounded-2xl border border-border/60 bg-card p-3">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-1 mb-1.5">
                {format(parseISO(date), "EEE, MMM d")}
              </p>
              <ul className="divide-y divide-border/60">
                {exps.map((exp) => (
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

export function Header({
  tripId,
  title,
  subtitle,
}: {
  tripId: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/trips/${tripId}/expenses`}
        className="shrink-0 w-9 h-9 rounded-xl border border-border bg-card hover:bg-accent/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Back to Money"
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

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
  const cat = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.other;
  const CatIcon = cat.icon;
  const isPayer = expense.paidBy === userId;
  const payerName = isPayer ? "You" : (expense.payer?.displayName ?? "Someone");
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
          <p className="text-[11px] text-muted-foreground truncate">
            {payerName}
            {iOwe && (
              <span className="ml-1.5 text-orange-600 dark:text-orange-400 font-semibold">
                · you owe {expense.currency} {fmt(mySplit!.amountOwed)}
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
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      </button>
    </li>
  );
}
