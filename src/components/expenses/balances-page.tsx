"use client";

import { useMemo, useState, useTransition } from "react";
import { fmtAmount as fmt } from "@/lib/numerals";
import { convert, type RateBundle } from "@/lib/fx";
import { ArrowRight, Check, CircleNotch as Loader2, Bell } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { UserAvatar } from "@/components/ui/user-avatar";
import { settleAllBetween } from "@/lib/actions/expenses";
import { useT } from "@/components/i18n/locale-provider";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];
function avatarColor(id: string) {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface Expense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  paidBy: string;
  scope: "shared" | "personal";
  splits: { userId: string; amountOwed: number; settled: boolean }[];
}

interface Props {
  tripId: string;
  userId: string;
  currency: string;
  expenses: Expense[];
  members: { userId: string; displayName: string; avatarUrl?: string | null }[];
  fxRates: RateBundle | null;
}

/**
 * B7: full Balances sub-page. Tester ask was a place to see who-owes-
 * who at full fidelity (not just the truncated preview).
 *
 * Two views:
 *   - Net balances per member (sortable)
 *   - "Suggested settlements" — minimum-transactions algorithm to
 *     square up the group with the fewest Venmo / cash exchanges.
 */
export function BalancesPage({ tripId, userId, currency, expenses, members, fxRates }: Props) {
  const [view, setView] = useState<"net" | "settle">("net");
  const t = useT();
  const [settling, setSettling] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // §7-C: nudge someone who owes you — shares (WhatsApp etc. on mobile) or
  // copies a friendly "please settle up" message.
  async function remind(fromName: string, amount: number) {
    const msg = `Hey ${fromName}, could you settle ${currency} ${fmt(amount)} for our trip? 🙏`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: msg });
        return;
      } catch {
        /* dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(msg);
      toast.success(t("balances.reminderCopied"));
    } catch {
      /* clipboard blocked */
    }
  }

  function markPaid(from: string, to: string) {
    const key = `${from}->${to}`;
    setSettling(key);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("tripId", tripId);
        fd.set("fromUserId", from);
        fd.set("toUserId", to);
        const result = await settleAllBetween(fd);
        toast.success(
          result.settled > 0
            ? t("balances.settledCount", { count: result.settled })
            : t("balances.nothingToSettle"),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("balances.settleFailed"));
      } finally {
        setSettling(null);
      }
    });
  }

  const data = useMemo(() => {
    function toBase(amount: number, ccy: string) {
      if (ccy === currency) return amount;
      const c = convert(amount, ccy, currency, fxRates);
      return c ?? 0;
    }

    const shared = expenses.filter((e) => e.scope !== "personal");

    const map = new Map<string, { userId: string; displayName: string; avatarUrl: string | null; net: number }>();
    for (const m of members) {
      map.set(m.userId, {
        userId: m.userId,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl ?? null,
        net: 0,
      });
    }
    // QA BUG-3: symmetric per-split netting (see expenses-board.tsx) — the
    // payer's self-split is settled at creation, so crediting the payer the
    // full amount while skipping settled splits over-credited every payer.
    for (const e of shared) {
      for (const sp of e.splits) {
        if (sp.settled || sp.userId === e.paidBy) continue;
        const owed = toBase(sp.amountOwed, e.currency);
        const p = map.get(e.paidBy);
        if (p) p.net += owed;
        const d = map.get(sp.userId);
        if (d) d.net -= owed;
      }
    }
    const nets = [...map.values()];

    // Greedy min-cash-flow: sort creditors desc, debtors asc, match
    // largest pairs until cleared. Not strictly optimal but produces a
    // settlement plan with at most N-1 transactions, which is what users
    // actually want.
    const creditors = nets.filter((n) => n.net > 0.005).map((n) => ({ ...n }));
    const debtors = nets.filter((n) => n.net < -0.005).map((n) => ({ ...n }));
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => a.net - b.net);

    const transfers: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const amt = Math.min(-d.net, c.net);
      if (amt > 0.005) {
        transfers.push({
          from: d.userId,
          fromName: d.displayName,
          to: c.userId,
          toName: c.displayName,
          amount: amt,
        });
        d.net += amt;
        c.net -= amt;
      }
      if (Math.abs(d.net) < 0.005) i++;
      if (Math.abs(c.net) < 0.005) j++;
    }

    return { nets, transfers };
  }, [expenses, members, currency, fxRates]);

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/trips/${tripId}/expenses`}
        title={t("expenses.balancesTitle")}
        subtitle={data.nets.length <= 1 ? t("expenses.balancesSolo") : t("expenses.whoOwesWho")}
      />

      {/* View switch — hidden when nothing to settle (solo trip). Canonical
          SegmentedControl so the tap targets clear 40px (was a p-0.5 /
          py-1 toggle ~24px tall) and the labels are localized. */}
      {members.length > 1 && (
        <SegmentedControl<"net" | "settle">
          aria-label={t("expenses.balances")}
          value={view}
          onChange={setView}
          options={[
            { value: "net", label: t("expenses.netPerPerson") },
            { value: "settle", label: t("expenses.settleUp") },
          ]}
        />
      )}

      {/* B8: solo-trip case — the net/settle views show nonsense when there's
          nobody else on the trip. Replace with a clean empty state that
          explains why and links to invite. */}
      {members.length <= 1 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center space-y-3">
          <p className="text-sm font-bold">{t("states.noOneToSettleWith")}</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {t("expenses.inviteBody")}
          </p>
          <a
            href={`/trips/${tripId}/members`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            {t("expenses.inviteCrew")}
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </a>
        </div>
      ) : view === "net" ? (
        <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
          {data.nets
            .slice()
            .sort((a, b) => b.net - a.net)
            .map((b) => {
              const isMe = b.userId === userId;
              return (
                <li key={b.userId} className="flex items-center gap-3 px-4 py-3">
                  <UserAvatar
                    name={b.displayName}
                    avatarUrl={b.avatarUrl}
                    seed={b.userId}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate"><bdi>{isMe ? t("expenses.you") : b.displayName}</bdi></p>
                    {/* B22: Each row is a full sentence so the relationship
                        is unambiguous when scanning. Wraps the amount and
                        currency directly into the verb phrase. */}
                    <p
                      className={`text-[11px] font-medium ${
                        b.net > 0.005
                          ? "text-emerald-600 dark:text-emerald-400"
                          : b.net < -0.005
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {b.net > 0.005
                        ? t(isMe ? "expenses.youOwedGroup" : "expenses.theyOwedGroup", { amount: `${currency} ${fmt(b.net)}` })
                        : b.net < -0.005
                          ? t(isMe ? "expenses.youOweGroup" : "expenses.owesGroup", { amount: `${currency} ${fmt(-b.net)}` })
                          : isMe ? t("common.youreSettled") : t("expenses.theySettled")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-base font-bold tabular-nums ${
                        b.net > 0.005
                          ? "text-emerald-600 dark:text-emerald-400"
                          : b.net < -0.005
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {b.net > 0 ? "+" : ""}{currency} {fmt(b.net)}
                    </p>
                  </div>
                </li>
              );
            })}
        </ul>
      ) : data.transfers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-12 text-center">
          <p className="text-sm font-semibold mb-1">{t("expenses.everyoneSettled")}</p>
          <p className="text-xs text-muted-foreground">{t("expenses.noBalancesSub")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.transfers.map((tr, idx) => {
            const fromIsMe = tr.from === userId;
            const toIsMe = tr.to === userId;
            const involvesMe = fromIsMe || toIsMe;
            const key = `${tr.from}->${tr.to}`;
            const isSettling = settling === key;
            return (
              <li
                key={idx}
                className="rounded-2xl border border-border/60 bg-card px-4 py-3 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${avatarColor(tr.from)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                    {tr.fromName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-center">
                    <p className="text-sm font-bold">
                      {fromIsMe ? "You" : tr.fromName} → {toIsMe ? "You" : tr.toName}
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {currency} {fmt(tr.amount)}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 rtl:rotate-180" />
                  <div className={`w-8 h-8 rounded-full ${avatarColor(tr.to)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                    {tr.toName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                {/* B20: Mark-as-paid CTA — visible only to the two parties
                    involved in the transfer. Bulk-settles every split
                    that represents money from→to in this trip. */}
                {involvesMe && (
                  <div className="flex items-center gap-2">
                    {/* §7-C: money owed to you → nudge the payer (WhatsApp/copy). */}
                    {toIsMe && (
                      <button
                        type="button"
                        onClick={() => remind(tr.fromName, tr.amount)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold py-1.5 transition-colors"
                      >
                        <Bell className="w-3 h-3" />
                        {t("balances.remind")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => markPaid(tr.from, tr.to)}
                      disabled={isSettling}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold py-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSettling ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      {isSettling ? t("balances.settling") : t("balances.markPaid")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
