"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaretRight, LockSimple, Plus, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/locale-provider";
import { type RateBundle } from "@/lib/fx";
import { createBaseConverter } from "@/lib/money-total";
import { netByContact } from "@/lib/outside-people";
import {
  addOutsidePerson,
  removeOutsidePerson,
  settleOutsidePerson,
  type OutsidePerson,
  type OutsideSplit,
} from "@/lib/actions/outside-people";
import { refused } from "@/lib/actions/refusal";

/**
 * People outside the trip, on the Money page: a strip per person who owes
 * or is owed, and a sheet to see everyone, settle up, or add someone.
 * Everything here is private to the viewer — it is never rendered for, or
 * sent to, anyone else in the crew.
 */

const fmt = (n: number) =>
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function useOutsideNets(
  people: OutsidePerson[],
  splits: OutsideSplit[],
  currency: string,
  fxRates: RateBundle | null,
) {
  return useMemo(() => {
    const { toBase } = createBaseConverter(currency, fxRates);
    const nets = netByContact(
      splits.map((s) => ({ ...s, amount: toBase(s.amount, s.currency) })),
    );
    return people.map((p) => ({ ...p, net: Math.round((nets.get(p.id) ?? 0) * 100) / 100 }));
  }, [people, splits, currency, fxRates]);
}

export function OutsidePeopleStrip({
  tripId,
  people,
  splits,
  currency,
  fxRates,
}: {
  tripId: string;
  people: OutsidePerson[];
  splits: OutsideSplit[];
  currency: string;
  fxRates: RateBundle | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const withNets = useOutsideNets(people, splits, currency, fxRates);
  const open_ = withNets.filter((p) => Math.abs(p.net) >= 0.01);

  return (
    <div className="space-y-2">
      {open_.slice(0, 3).map((p) => {
        const owesMe = p.net > 0;
        const tone = owesMe ? "var(--clr-moss)" : "var(--clr-horizon)";
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl border p-3 text-start"
            style={{
              background: owesMe ? "var(--clr-moss-dim)" : "var(--clr-horizon-dim)",
              borderColor: `color-mix(in srgb, ${tone} 35%, transparent)`,
            }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-extrabold shrink-0"
              style={{ background: tone, color: "var(--background)" }}
            >
              {p.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 text-[14px] font-bold">
              {owesMe
                ? t("outside.owesYou", { name: p.name, amount: `${currency} ${fmt(p.net)}` })
                : t("outside.youOwe", { name: p.name, amount: `${currency} ${fmt(p.net)}` })}
            </span>
            <CaretRight className="w-4 h-4 shrink-0 rtl:rotate-180" style={{ color: tone }} />
          </button>
        );
      })}

      {people.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 h-[52px] px-4 rounded-2xl bg-card border border-border text-start"
        >
          <UserCircle size={18} className="text-primary shrink-0" />
          <span className="flex-1 text-[15px] font-medium">{t("outside.title")}</span>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {t("outside.count", { count: people.length })}
          </span>
          <CaretRight size={16} className="text-tertiary shrink-0 rtl:rotate-180" />
        </button>
      )}

      <OutsidePeopleSheet
        open={open}
        onClose={() => setOpen(false)}
        tripId={tripId}
        people={withNets}
        currency={currency}
      />
    </div>
  );
}

function OutsidePeopleSheet({
  open,
  onClose,
  tripId,
  people,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  people: (OutsidePerson & { net: number })[];
  currency: string;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");

  const run = (fn: () => Promise<unknown>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (refused(r)) {
        toast.error(t(r.error));
        return;
      }
      toast.success(ok);
      router.refresh();
    });

  return (
    <BottomSheet open={open} onClose={onClose} title={t("outside.title")} subtitle={t("outside.sheetHint")} size="sm">
      <div className="space-y-3 pb-1">
        <ul className="divide-y divide-border/60">
          {people.map((p) => {
            const owesMe = p.net > 0.005;
            const iOwe = p.net < -0.005;
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="w-9 h-9 rounded-full border-[1.5px] border-dashed border-muted-foreground/60 flex items-center justify-center text-[13px] font-bold text-muted-foreground shrink-0">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold truncate" dir="auto">{p.name}</span>
                  <span
                    className="block text-[12px] font-semibold tabular-nums"
                    style={{ color: owesMe ? "var(--clr-moss)" : iOwe ? "var(--clr-horizon)" : undefined }}
                  >
                    {owesMe
                      ? t("outside.owesYouShort", { amount: `${currency} ${fmt(p.net)}` })
                      : iOwe
                        ? t("outside.youOweShort", { amount: `${currency} ${fmt(p.net)}` })
                        : t("outside.square")}
                  </span>
                </span>
                {owesMe || iOwe ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => settleOutsidePerson(tripId, p.id), t("outside.settledToast", { name: p.name }))
                    }
                    className="h-9 px-3 rounded-full border border-border text-[13px] font-bold shrink-0 disabled:opacity-50"
                  >
                    {t("outside.settle")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeOutsidePerson(tripId, p.id), t("outside.removedToast", { name: p.name }))}
                    className="h-9 px-3 rounded-full text-[13px] font-semibold text-muted-foreground shrink-0 disabled:opacity-50"
                  >
                    {t("common.remove")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name;
            run(async () => {
              const r = await addOutsidePerson(tripId, n);
              if (!refused(r)) setName("");
              return r;
            }, t("outside.addedToast", { name: name.trim() }));
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("outside.namePlaceholder")}
            maxLength={60}
            dir="auto"
            className="flex-1 min-w-0 rounded-xl border border-border bg-card px-3 h-12 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="h-12 px-4 rounded-full bg-primary text-primary-foreground font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {t("outside.add")}
          </button>
        </form>

        <p className="flex gap-2 rounded-xl bg-muted/50 p-3 text-[12px] leading-relaxed text-muted-foreground">
          <LockSimple className="w-4 h-4 shrink-0 mt-0.5" />
          {t("outside.privacy")}
        </p>
      </div>
    </BottomSheet>
  );
}
