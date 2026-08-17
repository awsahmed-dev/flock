"use client";

import { Warning } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Rendered under any money headline whose total had to skip rows because a
 * rate was missing (see createBaseConverter in lib/money-total). Silent when
 * nothing was skipped. The point is that an incomplete total is never shown
 * without saying so — a total that is quietly too low reads as good news.
 */
export function FxIncompleteNote({ currencies, className = "" }: { currencies: string[]; className?: string }) {
  const t = useT();
  if (currencies.length === 0) return null;
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-xs text-warning ${className}`}
    >
      <Warning weight="fill" className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>{t("expenses.fxIncomplete", { currencies: currencies.join(", ") })}</span>
    </p>
  );
}
