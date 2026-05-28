"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense } from "@/lib/actions/expenses";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { normalizeDigits, fmtAmount } from "@/lib/numerals";
import { Plus } from "lucide-react";

const CATEGORIES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "transport", label: "Transport" },
  { value: "food", label: "Food & drinks" },
  { value: "activity", label: "Activity" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" },
];

// Shown in the currency dropdown — popular travel-relevant currencies
// first, the rest of the world's majors after. Users can also type a
// 3-letter ISO code manually if theirs isn't in the list.
const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF",
  "CNY", "AED", "SAR", "INR", "THB", "IDR", "MYR",
  "SGD", "HKD", "KRW", "TWD", "TRY", "MXN", "BRL",
  "ZAR", "EGP", "NZD", "NOK", "SEK", "DKK", "PLN",
];

interface Props {
  tripId: string;
  /** Trip's base currency — used as the default for the currency picker. */
  baseCurrency: string;
  /** B2 Budget v2 — values threaded from ExpensesBoard so the dialog can
   *  show a live projection ("this will put you at 84%") as the user
   *  types. All four can be null/0 to skip a pill. */
  tripBudget: number | null;
  /** Current shared-scope spend in baseCurrency. */
  sharedSpent: number;
  personalBudget: number | null;
  /** Current user's personal spend (own personal + their share of shared)
   *  in baseCurrency. */
  personalSpent: number;
  /** Total trip member count — used to compute your share for shared
   *  expenses. Must be at least 1. */
  memberCount: number;
}

export function AddExpenseDialog({
  tripId,
  baseCurrency,
  tripBudget,
  sharedSpent,
  personalBudget,
  personalSpent,
  memberCount,
}: Props) {
  const currencyOptions = Array.from(
    new Set([baseCurrency, ...COMMON_CURRENCIES]),
  );
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // B2 Budget v2 — Shared splits across the crew; Personal is your own
  // pocket money (no splits, just counts toward your personal budget).
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  // Local mirror of the amount input so the live-projection pill can
  // recompute on every keystroke without dragging in a controlled form.
  const [amountInput, setAmountInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState(baseCurrency);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // Normalize Eastern Arabic / Persian numerals (٠١٢٣ / ۰۱۲۳) to ASCII so
    // type=number coercion on the server works regardless of locale.
    const rawAmount = (formData.get("amount") as string | null) ?? "";
    formData.set("amount", normalizeDigits(rawAmount));
    startTransition(async () => {
      try {
        await createExpense(formData);
        toast.success("Expense logged");
        track.expenseLogged(tripId, baseCurrency);
        // Tester finding: the chat sidebar's auto-posted expense card
        // was lagging behind the create flow by up to 10s (the polling
        // window). Dispatch a custom event so the open ChatSidebar can
        // refetch immediately; harmless if no sidebar is mounted.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("paxawa:chat-refresh"));
        }
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error((err as Error).message || "Failed to log expense");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Log expense</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log an expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="splitType" value="equal" />
          <input type="hidden" name="scope" value={scope} />

          {/* Shared vs Personal scope pill switcher. Drives whether the
              server creates expense_splits (shared) or just the single
              expense row (personal). */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 w-fit">
            <button
              type="button"
              onClick={() => setScope("shared")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                scope === "shared"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👥 Shared
            </button>
            <button
              type="button"
              onClick={() => setScope("personal")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                scope === "personal"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👤 Personal
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            {scope === "shared"
              ? "Splits equally across the crew · counts toward trip budget."
              : "Only counts toward your personal budget · no splits."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="title">Description</Label>
            <Input
              id="title"
              name="title"
              placeholder="Hotel checkout"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                /* type=text + inputmode=decimal so the input accepts
                   Eastern Arabic ٠١٢٣ and Persian ۰۱۲۳ digits without
                   the browser silently dropping them. We normalize to
                   ASCII in handleSubmit before the server sees them. */
                type="text"
                inputMode="decimal"
                pattern="[0-9٠-٩۰-۹.,]*"
                placeholder="0.00"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 w-24">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                className="w-full rounded-md border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* B2 Budget v2 — live projection. Only renders when the user
              types a numeric amount in the trip's base currency AND there's
              at least one cap to project against. */}
          <BudgetProjection
            amountInput={amountInput}
            currencyInput={currencyInput}
            baseCurrency={baseCurrency}
            scope={scope}
            memberCount={memberCount}
            tripBudget={tripBudget}
            sharedSpent={sharedSpent}
            personalBudget={personalBudget}
            personalSpent={personalSpent}
          />

          <div className="space-y-1.5">
            <Label htmlFor="expenseDate">Date</Label>
            <Input id="expenseDate" name="expenseDate" type="date" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              name="notes"
              placeholder="Any extra details"
            />
          </div>

          {scope === "shared" ? (
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              Splits equally among all trip members. You (the payer) are marked
              as settled.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              Counts only toward your personal budget. The crew won't see this
              in the shared totals.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Logging…" : "Log expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Inline projection pill — "this will put you at 84% of your budget."
 *
 *   - Parses the live amount the user is typing, normalizing Arabic /
 *     Persian digits + commas like the submit handler does.
 *   - Skips silently if the expense isn't in the trip's base currency
 *     (we don't FX-convert; the budget cards are base-only anyway).
 *   - Shows up to two stacked lines: one for trip budget (shared scope
 *     only, full amount), one for personal budget (full amount for
 *     personal scope, your-share for shared scope).
 *   - Threshold colors match the BudgetHealth card: 75% amber, 90%
 *     orange, 100%+ red.
 */
function BudgetProjection({
  amountInput,
  currencyInput,
  baseCurrency,
  scope,
  memberCount,
  tripBudget,
  sharedSpent,
  personalBudget,
  personalSpent,
}: {
  amountInput: string;
  currencyInput: string;
  baseCurrency: string;
  scope: "shared" | "personal";
  memberCount: number;
  tripBudget: number | null;
  sharedSpent: number;
  personalBudget: number | null;
  personalSpent: number;
}) {
  const parsed = parseFloat(normalizeDigits(amountInput));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  // Only project when the expense currency matches trip base — otherwise
  // we'd be comparing oranges to apples.
  if (currencyInput !== baseCurrency) {
    return (
      <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-1.5">
        Budget projection skipped — expense currency differs from trip base
        ({baseCurrency}).
      </p>
    );
  }

  // Trip projection — only meaningful for shared expenses.
  const tripImpact = scope === "shared" ? parsed : 0;
  const tripProjected = sharedSpent + tripImpact;

  // Personal projection — full amount for personal, your-share for shared.
  const personalImpact =
    scope === "personal"
      ? parsed
      : memberCount > 0
        ? parsed / memberCount
        : parsed;
  const personalProjected = personalSpent + personalImpact;

  const showTrip = tripBudget != null && tripBudget > 0 && tripImpact > 0;
  const showPersonal = personalBudget != null && personalBudget > 0;

  if (!showTrip && !showPersonal) return null;

  return (
    <div className="space-y-1.5">
      {showPersonal && (
        <ProjectionLine
          label={
            scope === "personal"
              ? "After this · your budget"
              : "After your share · your budget"
          }
          projected={personalProjected}
          cap={personalBudget!}
          currency={baseCurrency}
          impact={personalImpact}
        />
      )}
      {showTrip && (
        <ProjectionLine
          label="After this · trip budget"
          projected={tripProjected}
          cap={tripBudget!}
          currency={baseCurrency}
          impact={tripImpact}
        />
      )}
    </div>
  );
}

function ProjectionLine({
  label,
  projected,
  cap,
  currency,
  impact,
}: {
  label: string;
  projected: number;
  cap: number;
  currency: string;
  impact: number;
}) {
  const pct = (projected / cap) * 100;
  const { bg, border, text, dot } = projectionColors(pct);
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border ${border} ${bg} px-3 py-1.5 text-[11px]`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
        <span className="text-muted-foreground truncate">
          {label}
          <span className="text-foreground/70 ml-1.5 tabular-nums">
            +{currency} {fmtAmount(impact)}
          </span>
        </span>
      </div>
      <span className={`font-bold tabular-nums ${text}`}>
        {fmtAmount(pct)}%
      </span>
    </div>
  );
}

function projectionColors(pct: number): {
  bg: string;
  border: string;
  text: string;
  dot: string;
} {
  if (pct >= 100) {
    return {
      bg: "bg-red-500/[0.08]",
      border: "border-red-500/30",
      text: "text-red-500",
      dot: "bg-red-500",
    };
  }
  if (pct >= 90) {
    return {
      bg: "bg-orange-500/[0.06]",
      border: "border-orange-500/30",
      text: "text-orange-500",
      dot: "bg-orange-500",
    };
  }
  if (pct >= 75) {
    return {
      bg: "bg-amber-500/[0.06]",
      border: "border-amber-500/30",
      text: "text-amber-500",
      dot: "bg-amber-400",
    };
  }
  return {
    bg: "bg-emerald-500/[0.04]",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  };
}
