"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { setPersonalBudget } from "@/lib/actions/budget";
import { normalizeDigits } from "@/lib/numerals";
import { useT } from "@/components/i18n/locale-provider";

/**
 * QA round: the Personal-cap row on Money used to LINK to trip settings,
 * which read as a non-sequitur ("why am I in settings?"). The cap is a
 * per-member value with its own server action, so it gets its own small
 * sheet right on the Money page — same pattern as the trip BudgetSheet.
 */
export function PersonalCapSheet({
  tripId,
  currency,
  personalBudget,
  open,
  onClose,
}: {
  tripId: string;
  currency: string;
  personalBudget: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [amount, setAmount] = useState(
    personalBudget && personalBudget > 0 ? String(personalBudget) : "",
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("personalBudget", normalizeDigits(amount).replace(/[^0-9.]/g, ""));
    startTransition(async () => {
      try {
        await setPersonalBudget(fd);
        toast.success(t("expenses.capSaved"));
        router.refresh();
        onClose();
      } catch {
        toast.error(t("expenses.capSaveFailed"));
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("expenses.capSheetTitle")}
      subtitle={t("expenses.capSheetHint")}
      size="sm"
    >
      <div className="space-y-3 pb-1">
        <div className="flex gap-2">
          <span className="flex items-center rounded-xl border border-border bg-muted/40 px-3 h-14 text-sm font-bold text-muted-foreground shrink-0">
            {currency}
          </span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            className="flex-1 min-w-0 rounded-xl border border-border bg-card px-4 h-14 text-2xl font-extrabold tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <p className="text-[12px] text-muted-foreground">{t("expenses.capClearHint")}</p>
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {t("common.save")}
        </button>
      </div>
    </BottomSheet>
  );
}
