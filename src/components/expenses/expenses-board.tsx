"use client";

import { useMemo, useState } from "react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { BudgetHealth } from "./budget-health";
import { ExpenseSheet } from "./expense-sheet";
import {
  Receipt, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Eye, EyeOff,
  Plane, Utensils, Bed, ShoppingBag, Ticket, MoreHorizontal, ChevronRight,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays, isSameDay, isPast, isToday, isFuture, eachDayOfInterval } from "date-fns";
import { fmtAmount as fmt } from "@/lib/numerals";
import type { RateBundle } from "@/lib/fx";
import { convert } from "@/lib/fx";

/* ─── Static configs ─────────────────────────────────────────────────── */

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

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];
function avatarColor(id: string) {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* ─── Types ──────────────────────────────────────────────────────────── */

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
  /** B4: trip span — drives the daily-budget tracker. */
  startDate: string;
  endDate: string;
}

/* ─── Board ──────────────────────────────────────────────────────────── */

export function ExpensesBoard({
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
  // B4: balance privacy toggle — eye icon hides the big number for
  // shoulder-surfing on flights.
  const [showAmounts, setShowAmounts] = useState(true);
  // B4: "View all" expansion for the Recent Transactions block. Default 5.
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const selected = openId ? expenseList.find((e) => e.id === openId) ?? null : null;

  const derived = useMemo(() => {
    const sharedExpenses = expenseList.filter((e) => e.scope !== "personal");
    const personalExpenses = expenseList.filter((e) => e.scope === "personal");

    function toBase(amount: number, ccy: string) {
      if (ccy === currency) return amount;
      const c = convert(amount, ccy, currency, fxRates);
      return c ?? 0;
    }

    const totalSharedBase = sharedExpenses.reduce(
      (s, e) => s + toBase(e.amount, e.currency),
      0,
    );

    const myPaidBase = sharedExpenses
      .filter((e) => e.paidBy === userId)
      .reduce((s, e) => s + toBase(e.amount, e.currency), 0);

    const myOwedBase = sharedExpenses.reduce((s, e) => {
      const sp = e.splits.find((x) => x.userId === userId);
      if (!sp || sp.settled || e.paidBy === userId) return s;
      return s + toBase(sp.amountOwed, e.currency);
    }, 0);

    const myPersonalBase = personalExpenses
      .filter((e) => e.paidBy === userId)
      .reduce((s, e) => s + toBase(e.amount, e.currency), 0);

    const mySharedShareBase = sharedExpenses.reduce((s, e) => {
      const sp = e.splits.find((x) => x.userId === userId);
      return s + (sp ? toBase(sp.amountOwed, e.currency) : 0);
    }, 0);

    const balanceMap = new Map<string, { userId: string; displayName: string; net: number }>();
    for (const m of members) {
      balanceMap.set(m.userId, { userId: m.userId, displayName: m.displayName, net: 0 });
    }
    for (const e of sharedExpenses) {
      const p = balanceMap.get(e.paidBy);
      if (p) p.net += toBase(e.amount, e.currency);
      for (const sp of e.splits) {
        if (sp.settled) continue;
        const d = balanceMap.get(sp.userId);
        if (d) d.net -= toBase(sp.amountOwed, e.currency);
      }
    }
    const balances = [...balanceMap.values()];

    const categoryTotals = sharedExpenses.reduce<Record<string, number>>(
      (acc, e) => {
        acc[e.category] = (acc[e.category] ?? 0) + toBase(e.amount, e.currency);
        return acc;
      },
      {},
    );
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const expenseCurrencies = new Set(expenseList.map((e) => e.currency));
    const isMultiCurrency =
      expenseCurrencies.size > 1 ||
      (expenseCurrencies.size === 1 && !expenseCurrencies.has(currency));

    // B4: daily breakdown for the per-day tracker. Buckets every shared
    // expense by its expenseDate, base-converted, then walks the trip span
    // so empty days still appear in the list.
    const sharedByDay = new Map<string, number>();
    for (const e of sharedExpenses) {
      const key = e.expenseDate;
      sharedByDay.set(key, (sharedByDay.get(key) ?? 0) + toBase(e.amount, e.currency));
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
      sharedExpenses,
      personalExpenses,
      totalSharedBase,
      myPaidBase,
      myOwedBase,
      myPersonalBase,
      mySharedShareBase,
      personalSpentBase: myPersonalBase + mySharedShareBase,
      balances,
      topCategories,
      isMultiCurrency,
      dailyBreakdown,
    };
  }, [expenseList, members, currency, fxRates, userId, startDate, endDate]);

  const baseAmountFor = (e: Expense) =>
    e.currency === currency ? null : convert(e.amount, e.currency, currency, fxRates);

  // Daily target — only meaningful when the trip has a budget.
  const numDays = derived.dailyBreakdown.length;
  const dailyTarget = tripBudget && numDays > 0 ? tripBudget / numDays : null;

  // Sorted by date desc for the activity list.
  const sortedExpenses = expenseList
    .slice()
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  const visibleExpenses = showAllExpenses ? sortedExpenses : sortedExpenses.slice(0, 5);

  return (
    <div className="space-y-5">
      {/* ── Balance hero ───────────────────────────────────────────────
          B4: top-of-page summary, finance-app style. Big balance number,
          You-paid / You-owe pill-cards inside. Eye toggle hides amounts
          for shoulder-surfing on planes. */}
      <div className="relative rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 text-white overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-10 -bottom-6 w-24 h-24 rounded-full bg-white/8 pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex items-start justify-between mb-1">
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">
              Trip total spent
            </span>
            <button
              type="button"
              onClick={() => setShowAmounts((s) => !s)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label={showAmounts ? "Hide amounts" : "Show amounts"}
            >
              {showAmounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
            {currency}{" "}
            {showAmounts ? fmt(derived.totalSharedBase) : "•••••"}
          </p>
          {derived.isMultiCurrency && fxRates && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/70">
              <ArrowRightLeft className="w-3 h-3" />
              Live FX applied across {[...new Set(expenseList.map((e) => e.currency))].length} currencies
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/80">
                <ArrowUpRight className="w-3 h-3" /> You paid
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {currency} {showAmounts ? fmt(derived.myPaidBase) : "•••••"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/80">
                <ArrowDownRight className="w-3 h-3" /> You owe
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {currency} {showAmounts ? fmt(derived.myOwedBase) : "•••••"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Log expense — sticky CTA bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight">{expenseList.length} expense{expenseList.length !== 1 ? "s" : ""}</h2>
          <p className="text-[11px] text-muted-foreground">Across the trip, all currencies normalised</p>
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

      {/* ── Daily budget tracker ───────────────────────────────────────
          B4: tester ask — "show me daily." We split the trip budget
          evenly across days and grade each day vs the target. Days
          without a budget still appear with a flat spend bar so the
          rhythm of the trip is visible. */}
      <Section
        title="Daily tracker"
        action={
          tripBudget && dailyTarget
            ? `Target ${currency} ${fmt(dailyTarget)}/day`
            : "Set a trip budget to enable targets"
        }
      >
        <ul className="divide-y divide-border/60">
          {derived.dailyBreakdown.map((d) => {
            const pct = dailyTarget && dailyTarget > 0 ? (d.spent / dailyTarget) * 100 : 0;
            const tone =
              pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-orange-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";
            const dayLabel = isToday(d.date)
              ? "Today"
              : isPast(d.date)
                ? format(d.date, "EEE MMM d")
                : format(d.date, "EEE MMM d");
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
                    <p className="text-xs font-bold truncate">{dayLabel}</p>
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
                      <div
                        className={`h-full rounded-full ${tone}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {d.spent > 0 ? "Logged today" : isFuture(d.date) ? "Upcoming" : "Nothing logged"}
                    </p>
                  )}
                  {dailyTarget && (
                    <p className={`text-[10px] mt-0.5 ${pct >= 100 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {pct > 0 ? `${Math.round(pct)}% of daily target` : isFuture(d.date) ? "Upcoming day" : "Nothing logged"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* ── Budget Health ──────────────────────────────────────────────
          Trip cap + personal cap. Stays under daily tracker so the
          two budget views read together. */}
      <BudgetHealth
        tripId={tripId}
        baseCurrency={currency}
        tripBudget={tripBudget}
        sharedSpent={derived.totalSharedBase}
        personalBudget={personalBudget}
        personalSpent={derived.personalSpentBase}
        multiCurrency={derived.isMultiCurrency}
      />

      {/* ── Recent transactions ───────────────────────────────────────
          B4: replaces the Activity tab. Tap a row → bottom sheet for
          full splits + Settle. "View all" expands inline rather than
          navigating away. */}
      <Section
        title="Recent transactions"
        actionButton={
          sortedExpenses.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllExpenses((s) => !s)}
              className="text-[11px] font-bold tracking-wider uppercase text-primary hover:text-primary/80"
            >
              {showAllExpenses ? "Show recent" : "View all"}
            </button>
          ) : null
        }
      >
        {expenseList.length === 0 ? (
          <EmptyExpenseState
            tripId={tripId}
            currency={currency}
            tripBudget={tripBudget}
            personalBudget={personalBudget}
            sharedSpent={derived.totalSharedBase}
            personalSpent={derived.personalSpentBase}
            memberCount={Math.max(1, members.length)}
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {visibleExpenses.map((exp) => (
              <SlimExpenseRow
                key={exp.id}
                expense={exp}
                userId={userId}
                baseCurrency={currency}
                baseAmount={baseAmountFor(exp)}
                onClick={() => setOpenId(exp.id)}
              />
            ))}
          </ul>
        )}
      </Section>

      {/* ── Balances ─────────────────────────────────────────────────── */}
      {derived.balances.length > 0 && (
        <Section title="Balances">
          <ul className="divide-y divide-border/60">
            {derived.balances
              .slice()
              .sort((a, b) => b.net - a.net)
              .map((b) => {
                const isMe = b.userId === userId;
                return (
                  <li key={b.userId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(b.userId)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                      {b.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">{isMe ? "You" : b.displayName}</span>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${b.net > 0.005 ? "text-emerald-600 dark:text-emerald-400" : b.net < -0.005 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                        {b.net > 0 ? "+" : ""}{currency} {fmt(b.net)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.net > 0.005 ? "gets back" : b.net < -0.005 ? "owes" : "settled"}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </Section>
      )}

      {/* ── Category breakdown ───────────────────────────────────────── */}
      {derived.topCategories.length > 0 && (
        <Section title="Spending by category">
          <div className="space-y-2.5">
            {derived.topCategories.map(([cat, amount]) => {
              const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
              const pct = derived.totalSharedBase > 0 ? (amount / derived.totalSharedBase) * 100 : 0;
              const CatIcon = cfg.icon;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <CatIcon className={`w-3.5 h-3.5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{cfg.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {currency} {fmt(amount)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
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

/* ─── Bits ───────────────────────────────────────────────────────────── */

function Section({
  title,
  action,
  actionButton,
  children,
}: {
  title: string;
  /** Plain text trailing label, e.g. "Target $200/day" */
  action?: string;
  /** Or a clickable trailing element like "View all" */
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-end justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold">{title}</h3>
        {actionButton
          ? actionButton
          : action && (
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">
                {action}
              </span>
            )}
      </div>
      {children}
    </section>
  );
}

function SlimExpenseRow({
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
            {format(new Date(expense.expenseDate), "MMM d")} · {payerName}
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
            <p className="text-[10px] text-muted-foreground tabular-nums">
              ≈ {baseCurrency} {fmt(baseAmount)}
            </p>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
      </button>
    </li>
  );
}

function EmptyExpenseState({
  tripId,
  currency,
  tripBudget,
  personalBudget,
  sharedSpent,
  personalSpent,
  memberCount,
}: {
  tripId: string;
  currency: string;
  tripBudget: number | null;
  personalBudget: number | null;
  sharedSpent: number;
  personalSpent: number;
  memberCount: number;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border/60 p-6 text-center">
      <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
        <Receipt className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <p className="font-semibold text-sm mb-1">No expenses yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Log the first expense to start tracking the group spend
      </p>
      <AddExpenseDialog
        tripId={tripId}
        baseCurrency={currency}
        tripBudget={tripBudget}
        sharedSpent={sharedSpent}
        personalBudget={personalBudget}
        personalSpent={personalSpent}
        memberCount={memberCount}
      />
    </div>
  );
}
