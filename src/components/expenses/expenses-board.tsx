"use client";

import { useTransition } from "react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { BudgetHealth } from "./budget-health";
import { Button } from "@/components/ui/button";
import { settleSplit, deleteExpense } from "@/lib/actions/expenses";
import { toast } from "sonner";
import {
  Receipt, CheckCircle2, Trash2, TrendingUp,
  Plane, Utensils, Bed, ShoppingBag, Ticket, MoreHorizontal,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; dot: string }> = {
  accommodation: { label: "Stay", icon: Bed, bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  transport:     { label: "Transport", icon: Plane, bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  food:          { label: "Food", icon: Utensils, bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  activity:      { label: "Activity", icon: Ticket, bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  shopping:      { label: "Shopping", icon: ShoppingBag, bg: "bg-pink-100 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  other:         { label: "Other", icon: MoreHorizontal, bg: "bg-muted/60", text: "text-muted-foreground", dot: "bg-slate-400" },
};

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];

function getAvatarColor(str: string) {
  const h = str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

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
  /** B2 Budget v2 — "shared" (default) or "personal". Personal expenses
   *  have no splits and only count toward the payer's personal budget. */
  scope: "shared" | "personal";
  expenseDate: string;
  notes: string | null;
  createdAt: Date;
  payer?: { displayName: string } | null;
  splits: Split[];
}

interface BalanceSummary {
  userId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

interface Props {
  tripId: string;
  userId: string;
  currency: string;
  /** B2 Budget v2 — trip-shared cap set by the owner. NULL = no cap. */
  tripBudget: number | null;
  /** B2 Budget v2 — current user's personal budget for this trip. */
  personalBudget: number | null;
  expenses: Expense[];
  members: { userId: string; displayName: string }[];
}

function computeBalances(expenses: Expense[], members: { userId: string; displayName: string }[]): BalanceSummary[] {
  const map = new Map<string, BalanceSummary>();
  for (const m of members) {
    map.set(m.userId, { userId: m.userId, displayName: m.displayName, totalPaid: 0, totalOwed: 0, net: 0 });
  }
  for (const exp of expenses) {
    const payer = map.get(exp.paidBy);
    if (payer) payer.totalPaid += exp.amount;
    for (const split of exp.splits) {
      if (!split.settled) {
        const debtor = map.get(split.userId);
        if (debtor) debtor.totalOwed += split.amountOwed;
      }
    }
  }
  for (const s of map.values()) s.net = s.totalPaid - s.totalOwed;
  return [...map.values()];
}

// Money formatter: drop `.00` on whole-number amounts, keep 2 decimals
// otherwise. Matches the testers' "120 not 120.00" feedback.
import { fmtAmount as fmt } from "@/lib/numerals";

function ExpenseRow({ expense, userId, isOwner }: { expense: Expense; userId: string; isOwner: boolean }) {
  const [isPending, startTransition] = useTransition();
  const cat = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.other;
  const CatIcon = cat.icon;

  function handleSettle(splitId: string) {
    const fd = new FormData();
    fd.set("splitId", splitId);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try { await settleSplit(fd); toast.success("Marked as settled"); }
      catch { toast.error("Failed to settle"); }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("expenseId", expense.id);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try { await deleteExpense(fd); toast.success("Expense deleted"); }
      catch { toast.error("Failed to delete"); }
    });
  }

  const payerName = expense.paidBy === userId ? "You" : (expense.payer?.displayName ?? "Someone");
  const avatarColor = getAvatarColor(expense.paidBy);

  return (
    <div className="group rounded-2xl border border-border/60 bg-card hover:border-border transition-all p-4">
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
          <CatIcon className={`w-4.5 h-4.5 ${cat.text}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{expense.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                  {cat.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(expense.expenseDate), "MMM d")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-base font-bold tabular-nums">
                {expense.currency} {fmt(expense.amount)}
              </p>
              {(expense.paidBy === userId || isOwner) && (
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Paid by */}
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
              {payerName.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground">
              Paid by <span className="font-medium text-foreground">{payerName}</span>
            </span>
          </div>

          {expense.notes && (
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">{expense.notes}</p>
          )}
        </div>
      </div>

      {/* Splits */}
      {expense.splits.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {expense.splits.map((split) => (
            <div key={split.id} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${split.settled ? "bg-muted/30" : "bg-muted/60"}`}>
              <span className={split.settled ? "text-muted-foreground line-through" : "font-medium"}>
                {split.userId === userId ? "You" : (split.user?.displayName ?? "?")}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`tabular-nums ${split.settled ? "text-muted-foreground" : ""}`}>
                  {expense.currency} {fmt(split.amountOwed)}
                </span>
                {split.settled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : split.userId === userId && expense.paidBy !== userId ? (
                  <button
                    onClick={() => handleSettle(split.id)}
                    disabled={isPending}
                    className="text-primary hover:underline text-[10px] font-semibold shrink-0"
                  >
                    Settle
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExpensesBoard({
  tripId,
  userId,
  currency,
  tripBudget,
  personalBudget,
  expenses: expenseList,
  members,
}: Props) {
  const isOwner = members.some((m) => m.userId === userId);

  // B2 Budget v2 — split the feed by scope. Shared expenses fuel the trip
  // budget card + the "You paid / You owe" cards. Personal expenses are
  // a separate stream that only counts toward the payer's personal cap.
  const sharedExpenses = expenseList.filter((e) => e.scope !== "personal");
  const personalExpenses = expenseList.filter((e) => e.scope === "personal");

  // Multi-currency totals: group everything by ISO code, render either a
  // single value (when all expenses share a currency) or a stacked list
  // (e.g. "USD 1500 / EUR 240"). Summing across currencies would lie.
  const totalsByCurrency = sharedExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
      return acc;
    },
    {},
  );
  const currencyKeys = Object.keys(totalsByCurrency).sort();
  const isMultiCurrency = currencyKeys.length > 1;

  // Balances are computed from SHARED expenses only. A personal-scope
  // expense never shifts who-owes-whom.
  const balances = computeBalances(sharedExpenses, members);
  const myBalance = balances.find((b) => b.userId === userId);

  // Per-person totals grouped by currency for the "You paid / You owe" cards.
  const myPaidByCurrency = sharedExpenses
    .filter((e) => e.paidBy === userId)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
      return acc;
    }, {});
  const myOwedByCurrency = sharedExpenses.reduce<Record<string, number>>((acc, e) => {
    for (const s of e.splits) {
      if (s.userId === userId && !s.settled) {
        acc[e.currency] = (acc[e.currency] ?? 0) + s.amountOwed;
      }
    }
    return acc;
  }, {});

  // Per-category breakdown (still uses the user's primary currency only —
  // category percentages need a single denominator to be meaningful).
  const primary = isMultiCurrency
    ? currencyKeys.reduce((a, b) =>
        totalsByCurrency[a] >= totalsByCurrency[b] ? a : b,
      )
    : currencyKeys[0] ?? currency;

  // B2 Budget v2 — totals for the budget-health card. All numbers are in
  // the trip's base currency. Mixed-currency expenses are filtered to the
  // base; the multi-currency flag on the card warns when this skips data.
  const sharedSpentBase = sharedExpenses
    .filter((e) => e.currency === currency)
    .reduce((s, e) => s + e.amount, 0);
  const myPersonalBase = personalExpenses
    .filter((e) => e.paidBy === userId && e.currency === currency)
    .reduce((s, e) => s + e.amount, 0);
  const mySharedShareBase = sharedExpenses
    .filter((e) => e.currency === currency)
    .reduce((s, e) => {
      const mySplit = e.splits.find((sp) => sp.userId === userId);
      return s + (mySplit?.amountOwed ?? 0);
    }, 0);
  const personalSpentBase = myPersonalBase + mySharedShareBase;
  const expenseCurrencies = new Set(expenseList.map((e) => e.currency));
  const cardMultiCurrency =
    expenseCurrencies.size > 1 ||
    (expenseCurrencies.size === 1 && !expenseCurrencies.has(currency));
  const categoryTotals = expenseList
    .filter((e) => e.currency === primary)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const totalSpend = totalsByCurrency[primary] ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Expenses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track spending and who owes what</p>
        </div>
        <AddExpenseDialog tripId={tripId} baseCurrency={currency} />
      </div>

      {/* B2 Budget v2 — health card on top: trip cap vs shared spend +
          your personal cap vs your spend, with threshold coloring. */}
      <BudgetHealth
        tripId={tripId}
        baseCurrency={currency}
        tripBudget={tripBudget}
        sharedSpent={sharedSpentBase}
        personalBudget={personalBudget}
        personalSpent={personalSpentBase}
        multiCurrency={cardMultiCurrency}
      />

      {expenseList.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">Total spent</span>
              </div>
              {isMultiCurrency ? (
                <div className="flex flex-col gap-0.5">
                  {currencyKeys.map((c) => (
                    <p key={c} className="text-base font-bold tabular-nums">
                      {c} {fmt(totalsByCurrency[c])}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {currencyKeys[0] ?? currency} {fmt(totalSpend)}
                </p>
              )}
            </div>

            {myBalance && (
              <>
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">You paid</span>
                  </div>
                  {Object.keys(myPaidByCurrency).length > 1 ? (
                    <div className="flex flex-col gap-0.5">
                      {Object.entries(myPaidByCurrency)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([c, v]) => (
                          <p
                            key={c}
                            className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
                          >
                            {c} {fmt(v)}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {Object.keys(myPaidByCurrency)[0] ?? currency}{" "}
                      {fmt(Object.values(myPaidByCurrency)[0] ?? 0)}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg ${myBalance.totalOwed > 0 ? "bg-orange-100 dark:bg-orange-950/40" : "bg-muted/60"} flex items-center justify-center`}>
                      <ArrowDownRight className={`w-3.5 h-3.5 ${myBalance.totalOwed > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">You owe</span>
                  </div>
                  {Object.keys(myOwedByCurrency).length > 1 ? (
                    <div className="flex flex-col gap-0.5">
                      {Object.entries(myOwedByCurrency)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([c, v]) => (
                          <p
                            key={c}
                            className={`text-base font-bold tabular-nums ${v > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
                          >
                            {c} {fmt(v)}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <p
                      className={`text-xl font-bold tabular-nums ${myBalance.totalOwed > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}
                    >
                      {Object.keys(myOwedByCurrency)[0] ?? currency}{" "}
                      {fmt(Object.values(myOwedByCurrency)[0] ?? 0)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Category breakdown */}
          {topCategories.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Spending breakdown
                </p>
                {isMultiCurrency && (
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {primary} only
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {topCategories.map(([cat, amount]) => {
                  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                  const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                  const CatIcon = cfg.icon;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <CatIcon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{cfg.label}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{currency} {fmt(amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg.dot}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Balances */}
          {balances.length > 1 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Balances</p>
              <div className="space-y-2">
                {balances.map((b) => {
                  const isMe = b.userId === userId;
                  const avatarColor = getAvatarColor(b.userId);
                  return (
                    <div key={b.userId} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                        {b.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium flex-1 truncate">{isMe ? "You" : b.displayName}</span>
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular-nums ${b.net > 0 ? "text-emerald-600 dark:text-emerald-400" : b.net < 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                          {b.net > 0 ? "+" : ""}{currency} {fmt(b.net)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.net > 0 ? "gets back" : b.net < 0 ? "owes" : "settled"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            All expenses · {expenseList.length}
          </h3>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {expenseList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-sm mb-1">No expenses yet</p>
            <p className="text-xs text-muted-foreground mb-5">Log the first expense to start tracking the group spend</p>
            <AddExpenseDialog tripId={tripId} baseCurrency={currency} />
          </div>
        ) : (
          <div className="space-y-3">
            {expenseList
              .slice()
              .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
              .map((exp) => (
                <ExpenseRow key={exp.id} expense={exp} userId={userId} isOwner={isOwner} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
