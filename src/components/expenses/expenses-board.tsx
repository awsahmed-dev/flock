"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseSheet } from "./expense-sheet";
import {
  Receipt, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Eye, EyeOff,
  Plane, Utensils, Bed, ShoppingBag, Ticket, MoreHorizontal, ChevronRight,
} from "lucide-react";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { fmtAmount as fmt } from "@/lib/numerals";
import type { RateBundle } from "@/lib/fx";
import { convert } from "@/lib/fx";
import { useT } from "@/components/i18n/locale-provider";

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
}

/**
 * B7: Money page rebuilt as a pure overview.
 *
 * Tester ask: don't dump every section onto one wall — show a preview
 * of each + a "View all" CTA that opens a dedicated sub-page. Daily
 * tracker is folded under Activity as a sub-feature (not its own
 * top-level section). Each section's "View all" routes to:
 *   - /trips/[id]/expenses/transactions
 *   - /trips/[id]/expenses/breakdown
 *   - /trips/[id]/expenses/balances
 */
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
  const t = useT();
  const isOwner = members.some((m) => m.userId === userId);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAmounts, setShowAmounts] = useState(true);
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
      .slice(0, 3);

    const expenseCurrencies = new Set(expenseList.map((e) => e.currency));
    const isMultiCurrency =
      expenseCurrencies.size > 1 ||
      (expenseCurrencies.size === 1 && !expenseCurrencies.has(currency));

    return {
      sharedExpenses,
      totalSharedBase,
      myPaidBase,
      myOwedBase,
      personalSpentBase: myPersonalBase + mySharedShareBase,
      balances,
      topCategories,
      isMultiCurrency,
    };
  }, [expenseList, members, currency, fxRates, userId]);

  const baseAmountFor = (e: Expense) =>
    e.currency === currency ? null : convert(e.amount, e.currency, currency, fxRates);

  const recentExpenses = expenseList
    .slice()
    .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* ── Balance hero ───────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 text-white overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-10 -bottom-6 w-24 h-24 rounded-full bg-white/8 pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex items-start justify-between mb-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/90">
              {t("expenses.tripTotalSpent")}
            </span>
            <button
              type="button"
              onClick={() => setShowAmounts((s) => !s)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label={showAmounts ? "Hide amounts" : "Show amounts"}
            >
              {showAmounts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
            {currency} {showAmounts ? fmt(derived.totalSharedBase) : "•••••"}
          </p>
          {derived.isMultiCurrency && fxRates && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/70">
              <ArrowRightLeft className="w-3 h-3" />
              {t("expenses.liveFxApplied", { count: [...new Set(expenseList.map((e) => e.currency))].length })}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/80">
                <ArrowUpRight className="w-3 h-3" /> {t("expenses.youPaid")}
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {currency} {showAmounts ? fmt(derived.myPaidBase) : "•••••"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-white/80">
                <ArrowDownRight className="w-3 h-3" /> {t("expenses.youOwe")}
              </div>
              <p className="text-sm font-bold tabular-nums mt-0.5">
                {currency} {showAmounts ? fmt(derived.myOwedBase) : "•••••"}
              </p>
            </div>
          </div>

          {/* B9: trip-budget progress strip absorbed into the hero. Used
              to live as its own BudgetHealth card just below — that was
              showing the same EUR number a third time. Now it's a thin
              row inside the hero with a single progress bar. */}
          {tripBudget && tripBudget > 0 && (
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-white/80 mb-1.5">
                <span>{t("expenses.tripBudget")}</span>
                <span className="tabular-nums">
                  {currency} {showAmounts ? fmt(derived.totalSharedBase) : "•••"}
                  <span className="text-white/60 ms-1 font-medium">
                    / {fmt(tripBudget)}
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    derived.totalSharedBase / tripBudget >= 1
                      ? "bg-red-300"
                      : derived.totalSharedBase / tripBudget >= 0.9
                        ? "bg-orange-300"
                        : derived.totalSharedBase / tripBudget >= 0.75
                          ? "bg-amber-300"
                          : "bg-white"
                  }`}
                  style={{
                    width: `${Math.min(100, (derived.totalSharedBase / tripBudget) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/70">
                <span>
                  {t("expenses.percentUsed", { percent: Math.round((derived.totalSharedBase / tripBudget) * 100) })}
                </span>
                {/* Personal budget mini-stat OR a "set your budget" hint —
                    no longer its own giant card. */}
                <Link
                  href={`/trips/${tripId}/settings`}
                  className="hover:text-white inline-flex items-center gap-1"
                >
                  {personalBudget && personalBudget > 0 ? (
                    <>
                      Personal cap {currency} {fmt(personalBudget)} ·{" "}
                      {Math.round(
                        (derived.personalSpentBase / personalBudget) * 100,
                      )}
                      % used
                    </>
                  ) : (
                    <>{t("expenses.setPersonalCap")}</>
                  )}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* B9: single CTA row — was a separate "2 expenses · Log expense"
          sub-header that read as decorative. Now it's a tight bar with
          just the action; expense count moved into the hero's empty
          state. */}
      <div className="flex items-center justify-end">
        <AddExpenseDialog
          tripId={tripId}
          baseCurrency={currency}
          tripBudget={tripBudget}
          sharedSpent={derived.totalSharedBase}
          personalBudget={personalBudget}
          personalSpent={derived.personalSpentBase}
          memberCount={Math.max(1, members.length)}
          fxRates={fxRates}
        />
      </div>

      {/* ── Activity preview (with View all → /transactions) ──────── */}
      <SectionCard
        title={`${t("expenses.activity")}${expenseList.length > 0 ? ` · ${expenseList.length}` : ""}`}
        subtitle={t("expenses.mostRecent")}
        viewAllHref={`/trips/${tripId}/expenses/transactions`}
        empty={expenseList.length === 0}
        emptyLabel={t("expenses.activity")}
      >
        <ul className="divide-y divide-border/60">
          {recentExpenses.map((exp) => (
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
      </SectionCard>

      {/* ── Spending breakdown preview (top 3 categories) ──────────── */}
      {derived.topCategories.length > 0 && (
        <SectionCard
          title={t("expenses.spendingBreakdown")}
          subtitle={t("expenses.topCategories")}
          viewAllHref={`/trips/${tripId}/expenses/breakdown`}
        >
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
                      <div
                        className={`h-full rounded-full ${cfg.dot}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right tabular-nums whitespace-nowrap">
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── Balances preview ──────────────────────────────────────── */}
      {derived.balances.length > 0 && (
        <SectionCard
          title={t("expenses.balances")}
          subtitle={t("expenses.whoOwesWho")}
          viewAllHref={`/trips/${tripId}/expenses/balances`}
        >
          <ul className="divide-y divide-border/60">
            {derived.balances
              .slice()
              .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
              .slice(0, 4)
              .map((b) => {
                const isMe = b.userId === userId;
                return (
                  <li key={b.userId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={`w-8 h-8 rounded-full ${avatarColor(b.userId)} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                      {b.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium flex-1 truncate">
                      {isMe ? "You" : b.displayName}
                    </span>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          b.net > 0.005
                            ? "text-emerald-600 dark:text-emerald-400"
                            : b.net < -0.005
                              ? "text-orange-600 dark:text-orange-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {b.net > 0 ? "+" : ""}
                        {currency} {fmt(b.net)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.net > 0.005 ? t("expenses.getsBack") : b.net < -0.005 ? t("expenses.owes") : t("common.youreSettled")}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </SectionCard>
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

function SectionCard({
  title,
  subtitle,
  viewAllHref,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  empty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {empty ? (
        <p className="text-[11px] text-muted-foreground italic px-1 py-3">
          {emptyLabel}
        </p>
      ) : (
        children
      )}
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
              <span className="ms-1.5 text-orange-600 dark:text-orange-400 font-semibold">
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
