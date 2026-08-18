"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { setTripBudget } from "@/lib/actions/trip-settings";
import { useT, useLocale } from "@/components/i18n/locale-provider";

const CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "JPY", "INR", "EGP", "TRY", "THB"];

/**
 * §2-D: set-a-budget bottom sheet, opened from the NOW cockpit budget bar.
 * Currency selector + a large amount input → persists the trip's total budget.
 */
export function BudgetSheet({
  open,
  onClose,
  tripId,
  currency,
  total,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currency: string;
  total: number | null;
}) {
  const t = useT();
  const { isRtl } = useLocale();
  const router = useRouter();
  const [cur, setCur] = useState(currency || "USD");
  const [amount, setAmount] = useState(total != null ? String(total) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const val = amount.trim() ? parseFloat(amount) : null;
    if (val != null && (Number.isNaN(val) || val < 0)) return;
    setSaving(true);
    try {
      await setTripBudget(tripId, val, cur);
      router.refresh();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t("now.budgetSheetTitle")} subtitle={t("now.budgetSheetHint")} size="sm">
      {/* Video round 3: 16px between elements, 24px before the primary action. */}
      <div className="space-y-4 pt-2 pb-2">
        <div className="flex gap-2">
          <select
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            aria-label="Currency"
            dir={isRtl ? "rtl" : "ltr"}
            className="text-sm font-bold outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            autoFocus
            className="flex-1 min-w-0 rounded-xl border border-border bg-card px-4 h-14 text-2xl font-extrabold tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="!mt-6 w-full h-12 rounded-full bg-primary text-primary-foreground font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {t("now.saveBudget")}
        </button>
      </div>
    </BottomSheet>
  );
}
