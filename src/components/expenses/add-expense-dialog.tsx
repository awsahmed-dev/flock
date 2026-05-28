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
import { normalizeDigits } from "@/lib/numerals";
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
}

export function AddExpenseDialog({ tripId, baseCurrency }: Props) {
  const currencyOptions = Array.from(
    new Set([baseCurrency, ...COMMON_CURRENCIES]),
  );
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // B2 Budget v2 — Shared splits across the crew; Personal is your own
  // pocket money (no splits, just counts toward your personal budget).
  const [scope, setScope] = useState<"shared" | "personal">("shared");

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
              />
            </div>
            <div className="space-y-1.5 w-24">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                defaultValue={baseCurrency}
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
