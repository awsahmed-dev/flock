"use client";

import { useTransition } from "react";
import { format } from "@/lib/i18n/date-fns";
import { CheckCircle as CheckCircle2, Trash as Trash2, Receipt, ArrowsLeftRight as ArrowRightLeft } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { settleSplit, deleteExpense } from "@/lib/actions/expenses";
import { fmtAmount as fmt } from "@/lib/numerals";
import { useT } from "@/components/i18n/locale-provider";

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
  payer?: { displayName: string } | null;
  splits: Split[];
}

interface Props {
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Owner of the trip — can delete any expense. */
  isOwner: boolean;
  /** Pre-converted amount in the trip's base currency. NULL when the
   *  expense is already in base or FX wasn't available. */
  baseAmount: number | null;
  baseCurrency: string;
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
];
function avatarColor(id: string) {
  const h = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Per-expense detail sheet. Opens on row tap with the full breakdown:
 * amount (and live FX conversion), payer, splits, settle controls,
 * notes, and destructive actions gated by ownership/payer identity.
 *
 * Replaces the inline split grid that used to live on every list row —
 * keeps the list scannable while still putting one tap between the user
 * and the "Settle" button.
 */
export function ExpenseSheet({
  expense,
  open,
  onClose,
  userId,
  isOwner,
  baseAmount,
  baseCurrency,
}: Props) {
  const t = useT();
  const [isPending, startTransition] = useTransition();

  if (!expense) return <BottomSheet open={open} onClose={onClose}>{null}</BottomSheet>;

  const isPayer = expense.paidBy === userId;
  const payerName = isPayer ? t("expenses.you") : (expense.payer?.displayName ?? t("expenses.someone"));
  const canDelete = isPayer || isOwner;

  function handleSettle(splitId: string) {
    if (!expense) return;
    const fd = new FormData();
    fd.set("splitId", splitId);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try { await settleSplit(fd); toast.success(t("expenses.settledToast")); }
      catch { toast.error(t("common.error")); }
    });
  }

  function handleDelete() {
    if (!expense) return;
    const fd = new FormData();
    fd.set("expenseId", expense.id);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try {
        await deleteExpense(fd);
        toast.success(t("settings.expenseDeleted"));
        onClose();
      } catch {
        toast.error(t("settings.failedToDelete"));
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={expense.title}
      subtitle={`${format(new Date(expense.expenseDate), "EEE, MMM d")} · ${
        expense.scope === "personal" ? t("expenses.personal") : t("expenses.shared")
      }`}
      footer={
        canDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("common.delete")}
          </button>
        ) : null
      }
    >
      {/* Amount card */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-background p-4 mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
          {t("expenses.amount")}
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-tight">
          {expense.currency} {fmt(expense.amount)}
        </p>
        {baseAmount !== null && expense.currency !== baseCurrency && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowRightLeft className="w-3 h-3" />
            ≈ <bdi>{baseCurrency} {fmt(baseAmount)}</bdi> <span className="opacity-60">{t("expenses.liveRate")}</span>
          </p>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
          <div className={`w-7 h-7 rounded-full ${avatarColor(expense.paidBy)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
            {payerName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground">
            {t("expenses.paidBy")} <span className="font-semibold text-foreground"><bdi>{payerName}</bdi></span>
          </span>
        </div>
      </div>

      {/* Splits */}
      {expense.splits.length > 0 ? (
        <div className="mb-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-2 px-1">
            {t("expenses.splitBetween", { count: expense.splits.length })}
          </p>
          <div className="space-y-1.5">
            {expense.splits.map((split) => {
              const isMe = split.userId === userId;
              const owesMe = isPayer && !isMe && !split.settled;
              const iOwe = isMe && !isPayer && !split.settled;
              return (
                <div
                  key={split.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    split.settled
                      ? "border-border/40 bg-muted/30"
                      : "border-border bg-card"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full ${avatarColor(split.userId)} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                    {(isMe ? t("expenses.you") : split.user?.displayName ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`text-sm flex-1 truncate ${split.settled ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {isMe ? t("expenses.you") : split.user?.displayName ?? "?"}
                  </span>
                  <span className={`text-sm tabular-nums ${split.settled ? "text-muted-foreground" : "font-semibold"}`}>
                    {expense.currency} {fmt(split.amountOwed)}
                  </span>
                  {split.settled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("common.youreSettled")}
                    </span>
                  ) : iOwe ? (
                    <button
                      type="button"
                      onClick={() => handleSettle(split.id)}
                      disabled={isPending}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {t("expenses.settle")}
                    </button>
                  ) : owesMe ? (
                    <button
                      type="button"
                      onClick={() => handleSettle(split.id)}
                      disabled={isPending}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold hover:bg-emerald-500/15 transition-colors disabled:opacity-50"
                    >
                      {t("expenses.markPaid")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-3 mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Receipt className="w-3.5 h-3.5" />
          {t("expenses.personalNoSplits")}
        </div>
      )}

      {/* Notes */}
      {expense.notes && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground italic mb-3">
          {expense.notes}
        </div>
      )}

      {/* B12: receipt thumbnail. Tap opens the full image in a new tab —
          simpler than a nested lightbox inside the sheet. */}
      {expense.receiptUrl && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground px-3 pt-2">
            {t("expenses.receipt")}
          </p>
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 pb-3 pt-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.receiptUrl}
              alt="Receipt"
              className="w-full max-h-64 object-contain rounded-lg bg-muted/40"
            />
          </a>
        </div>
      )}
    </BottomSheet>
  );
}
