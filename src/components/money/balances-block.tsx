"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { markSettled } from "@/lib/actions/settlements";
import type { SettlementPair } from "@/lib/settle";
import type { CockpitCrew } from "@/components/trips/cockpit/types";

/**
 * Phase 6 §8-A — the Balances block. Simplified pairs (minimal
 * transactions), [Settle] with a confirm step, settlements land in the
 * table + the Pulse. Hidden for solo trips / zero expenses by the parent.
 */
export function BalancesBlock({
  tripId, pairs, crew, currency, currentUserId,
}: {
  tripId: string;
  pairs: SettlementPair[];
  crew: CockpitCrew[];
  currency: string;
  currentUserId: string;
}) {
  const t = useT();
  const [settled, setSettled] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const nameOf = (id: string) => crew.find((m) => m.userId === id)?.displayName.split(" ")[0] ?? "Someone";
  const open = pairs.filter((p) => !settled.has(`${p.fromUserId}:${p.toUserId}`));

  return (
    <section className="rounded-3xl bg-card border border-border p-4 mt-1">
      <p className="text-[15px] font-bold mb-2" style={{ marginTop: 4 }}>{t("expenses.balances")}</p>
      {open.length === 0 ? (
        <p className="text-[15px] text-muted-foreground py-2">{t("expenses.allSquare")}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {open.map((p) => {
            const key = `${p.fromUserId}:${p.toUserId}`;
            const amountStr = `${currency} ${p.amount.toLocaleString()}`;
            const line =
              p.toUserId === currentUserId
                ? t("expenses.owesYouLine", { name: nameOf(p.fromUserId), amount: amountStr })
                : p.fromUserId === currentUserId
                  ? t("expenses.youOweLine", { name: nameOf(p.toUserId), amount: amountStr })
                  : t("expenses.owesLine", { from: nameOf(p.fromUserId), to: nameOf(p.toUserId), amount: amountStr });
            return (
              <div key={key} className="flex items-center gap-3 h-16">
                <UserAvatar
                  name={nameOf(p.fromUserId)}
                  avatarUrl={crew.find((m) => m.userId === p.fromUserId)?.avatarUrl ?? null}
                  seed={p.fromUserId}
                  size="md"
                />
                <span className="flex-1 min-w-0 text-[15px] font-medium truncate">{line}</span>
                {confirming === key ? (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(null);
                      setSettled((prev) => new Set(prev).add(key));
                      startTransition(() => {
                        markSettled({ tripId, creditorId: p.toUserId, debtorId: p.fromUserId, amount: p.amount, currency })
                          .then(() => toast.success(t("expenses.settleMarked", { amount: amountStr })))
                          .catch(() => {
                            setSettled((prev) => {
                              const next = new Set(prev);
                              next.delete(key);
                              return next;
                            });
                            toast.error(t("expenses.settleMarkFailed"));
                          });
                      });
                    }}
                    className="shrink-0 h-8 px-3 rounded-full bg-primary text-primary-foreground text-[12px] font-bold"
                  >
                    {t("expenses.confirm")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(key)}
                    className="shrink-0 h-8 px-3 rounded-full border border-border text-[12px] font-bold text-foreground"
                  >
                    {t("expenses.settle")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
