"use client";

import { useMemo } from "react";
import {
  Bed, Plane, Utensils, Ticket, ShoppingBag, MoreHorizontal,
} from "lucide-react";
import { fmtAmount as fmt } from "@/lib/numerals";
import { convert, type RateBundle } from "@/lib/fx";
import { PageHeader } from "@/components/ui/page-header";
import { useT } from "@/components/i18n/locale-provider";

const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ElementType; bg: string; text: string; dot: string; tint: string }
> = {
  accommodation: { icon: Bed,           bg: "bg-blue-100 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-300",     dot: "bg-blue-500",    tint: "from-blue-500/20 to-blue-500/5" },
  transport:     { icon: Plane,         bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500",  tint: "from-orange-500/20 to-orange-500/5" },
  food:          { icon: Utensils,      bg: "bg-green-100 dark:bg-green-950/40",   text: "text-green-700 dark:text-green-300",   dot: "bg-green-500",   tint: "from-green-500/20 to-green-500/5" },
  activity:      { icon: Ticket,        bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500",  tint: "from-purple-500/20 to-purple-500/5" },
  shopping:      { icon: ShoppingBag,   bg: "bg-pink-100 dark:bg-pink-950/40",     text: "text-pink-700 dark:text-pink-300",     dot: "bg-pink-500",    tint: "from-pink-500/20 to-pink-500/5" },
  other:         { icon: MoreHorizontal,bg: "bg-muted/60",                         text: "text-muted-foreground",                dot: "bg-slate-400",   tint: "from-slate-400/20 to-slate-400/5" },
};
const CATEGORY_LABEL_KEY: Record<string, string> = {
  accommodation: "expenses.catStay",
  transport: "expenses.catTransport",
  food: "expenses.catFood",
  activity: "expenses.catActivity",
  shopping: "expenses.catShopping",
  other: "expenses.catOther",
};

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
  splits: { userId: string; amountOwed: number; settled: boolean }[];
}

interface Props {
  tripId: string;
  currency: string;
  expenses: Expense[];
  fxRates: RateBundle | null;
}

/**
 * B7: full Spending Breakdown sub-page. Reached from the Money
 * overview's "View all" on the categories preview.
 *
 * Shows every category with a tinted card, the absolute spend, the
 * share-of-total percentage, the transaction count, and the average
 * per transaction. Plus a "by member" mini-card that surfaces how each
 * traveller's category mix differs (e.g. roommate is spending mostly
 * on Stay, you're mostly on Food).
 */
export function BreakdownPage({ tripId, currency, expenses, fxRates }: Props) {
  const t = useT();
  const sharedCount = expenses.filter((e) => e.scope !== "personal").length;
  const data = useMemo(() => {
    function toBase(amount: number, ccy: string) {
      if (ccy === currency) return amount;
      const c = convert(amount, ccy, currency, fxRates);
      return c ?? 0;
    }

    const shared = expenses.filter((e) => e.scope !== "personal");
    const totalBase = shared.reduce((s, e) => s + toBase(e.amount, e.currency), 0);

    const byCat = new Map<string, { total: number; count: number }>();
    for (const e of shared) {
      const cur = byCat.get(e.category) ?? { total: 0, count: 0 };
      cur.total += toBase(e.amount, e.currency);
      cur.count += 1;
      byCat.set(e.category, cur);
    }
    const cats = [...byCat.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, v]) => ({
        cat,
        total: v.total,
        count: v.count,
        avg: v.count > 0 ? v.total / v.count : 0,
        pct: totalBase > 0 ? (v.total / totalBase) * 100 : 0,
      }));

    return { totalBase, cats };
  }, [expenses, currency, fxRates]);

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/trips/${tripId}/expenses`}
        title={t("expenses.spendingBreakdown")}
        subtitle={t("expenses.breakdownSubtitle", {
          currency,
          total: fmt(data.totalBase),
          count: sharedCount,
        })}
      />

      {data.cats.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
          <p className="text-sm font-semibold mb-1">{t("expenses.breakdownEmptyTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("expenses.breakdownEmptySub")}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {data.cats.map(({ cat, total, count, avg, pct }) => {
            const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
            const CatIcon = cfg.icon;
            return (
              <section
                key={cat}
                className={`rounded-2xl border border-border/60 bg-gradient-to-br ${cfg.tint} p-4`}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <CatIcon className={`w-4 h-4 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">
                      {t(CATEGORY_LABEL_KEY[cat] ?? CATEGORY_LABEL_KEY.other)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("expenses.transactionsCount", { count })}
                    </p>
                  </div>
                  <p className="text-xs font-bold tabular-nums text-right">
                    {Math.round(pct)}%
                  </p>
                </div>

                <p className="text-xl font-bold tabular-nums tracking-tight">
                  {currency} {fmt(total)}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {t("expenses.avgPerExpense", { currency, amount: fmt(avg) })}
                </p>

                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
