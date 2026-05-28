"use client";

import { useMemo, useState } from "react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { BudgetHealth } from "./budget-health";
import { ExpenseSheet } from "./expense-sheet";
import {
  Receipt, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRightLeft,
  Plane, Utensils, Bed, ShoppingBag, Ticket, MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { fmtAmount as fmt } from "@/lib/numerals";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  /** Snapshot of FX rates pre-fetched server-side. NULL when the upstream
   *  failed — the UI then hides the "≈ base" hints rather than guessing. */
  fxRates: RateBundle | null;
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
}: Props) {
  const isOwner = members.some((m) => m.userId === userId);

  // Selected expense for the bottom sheet — controlled here so a single
  // sheet instance handles every row (cheaper than mounting one per row).
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = openId ? expenseList.find((e) => e.id === openId) ?? null : null;

  // ── Derive everything once per render. The shared/personal split fuels
  //    every downstream stat; balances only consider shared.
  const derived = useMemo(() => {
    const sharedExpenses = expenseList.filter((e) => e.scope !== "personal");
    const personalExpenses = expenseList.filter((e) => e.scope === "personal");

    // Convert each shared expense's amount into base currency so the
    // top-level totals work even when expenses are logged in mixed CCYs.
    // Falls back to "0" contribution when FX missing for that pair.
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

    // Balances per-member — net of paid - owed, all converted to base.
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

    // Category breakdown — all in base so the bars actually sum.
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

    // Multi-currency = whether the page shows mixed ISOs at all. Drives a
    // "live rates applied" badge so users know the totals aren't naive.
    const expenseCurrencies = new Set(expenseList.map((e) => e.currency));
    const isMultiCurrency =
      expenseCurrencies.size > 1 ||
      (expenseCurrencies.size === 1 && !expenseCurrencies.has(currency));

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
    };
  }, [expenseList, members, currency, fxRates, userId]);

  // Pre-compute base-currency conversion for the sheet so the click is
  // free of any async work.
  const baseAmountFor = (e: Expense) =>
    e.currency === currency ? null : convert(e.amount, e.currency, currency, fxRates);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Money</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {expenseList.length} expense{expenseList.length !== 1 ? "s" : ""}
            {derived.isMultiCurrency && fxRates && (
              <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
                <ArrowRightLeft className="w-2.5 h-2.5" />
                Live FX
              </span>
            )}
          </p>
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

      {/* Compact 1-line summary — replaces the old 3-tile grid. Smaller
          text per the tester ask; values sit on a single row with mini
          icons. On narrow screens it wraps to 2 lines but stays compact. */}
      <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <SummaryStat
          icon={<TrendingUp className="w-3 h-3" />}
          label="Total"
          value={`${currency} ${fmt(derived.totalSharedBase)}`}
        />
        <SummaryStat
          icon={<ArrowUpRight className="w-3 h-3 text-emerald-500" />}
          label="You paid"
          value={`${currency} ${fmt(derived.myPaidBase)}`}
          tone="emerald"
        />
        <SummaryStat
          icon={<ArrowDownRight className="w-3 h-3 text-orange-500" />}
          label="You owe"
          value={`${currency} ${fmt(derived.myOwedBase)}`}
          tone={derived.myOwedBase > 0 ? "orange" : "muted"}
        />
      </div>

      {/* Tabs — Overview / Activity / Balances. Keeps the page scannable
          and lets us hide the dense breakdown behind a deliberate tap. */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
          <TabsTrigger value="balances" className="flex-1">Balances</TabsTrigger>
        </TabsList>

        {/* ── Overview: budget health + category breakdown ───────────── */}
        <TabsContent value="overview" className="space-y-4 mt-3">
          <BudgetHealth
            tripId={tripId}
            baseCurrency={currency}
            tripBudget={tripBudget}
            sharedSpent={derived.totalSharedBase}
            personalBudget={personalBudget}
            personalSpent={derived.personalSpentBase}
            multiCurrency={derived.isMultiCurrency}
          />

          {derived.topCategories.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Spending breakdown
              </p>
              <div className="space-y-2.5">
                {derived.topCategories.map(([cat, amount]) => {
                  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                  const pct =
                    derived.totalSharedBase > 0
                      ? (amount / derived.totalSharedBase) * 100
                      : 0;
                  const CatIcon = cfg.icon;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
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
            </div>
          )}
        </TabsContent>

        {/* ── Activity: slim row list, tap → sheet ───────────────────── */}
        <TabsContent value="activity" className="mt-3">
          {expenseList.length === 0 ? (
            <EmptyState
              tripId={tripId}
              currency={currency}
              tripBudget={tripBudget}
              personalBudget={personalBudget}
              sharedSpent={derived.totalSharedBase}
              personalSpent={derived.personalSpentBase}
              memberCount={Math.max(1, members.length)}
            />
          ) : (
            <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
              {expenseList
                .slice()
                .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
                .map((exp) => (
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
        </TabsContent>

        {/* ── Balances: net per-member, base currency ────────────────── */}
        <TabsContent value="balances" className="mt-3">
          {derived.balances.length === 0 ? (
            <p className="text-xs text-muted-foreground italic px-2">No members yet.</p>
          ) : (
            <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
              {derived.balances
                .slice()
                .sort((a, b) => b.net - a.net)
                .map((b) => {
                  const isMe = b.userId === userId;
                  return (
                    <li key={b.userId} className="flex items-center gap-3 px-4 py-3">
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
          )}
        </TabsContent>
      </Tabs>

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

function SummaryStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "orange" | "muted";
}) {
  const valueClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "orange"
        ? "text-orange-600 dark:text-orange-400"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${valueClass}`}>{value}</span>
    </div>
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
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
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
      </button>
    </li>
  );
}

function EmptyState({
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
    <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
        <Receipt className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <p className="font-semibold text-sm mb-1">No expenses yet</p>
      <p className="text-xs text-muted-foreground mb-5">
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
