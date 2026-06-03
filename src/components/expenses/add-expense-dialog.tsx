"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExpense } from "@/lib/actions/expenses";
import { toast } from "sonner";
import { track } from "@/lib/analytics/events";
import { normalizeDigits, fmtAmount } from "@/lib/numerals";
import { inferCategory, type ExpenseCategory } from "@/lib/expense-category";
import { convert, type RateBundle } from "@/lib/fx";
import { Plus, Bed, Plane, Utensils, Ticket, ShoppingBag, MoreHorizontal, Users, User, Receipt, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/locale-provider";

const CATEGORIES: { value: ExpenseCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: "accommodation", label: "Stay", icon: Bed, color: "text-blue-600 dark:text-blue-400" },
  { value: "transport", label: "Transport", icon: Plane, color: "text-orange-600 dark:text-orange-400" },
  { value: "food", label: "Food", icon: Utensils, color: "text-green-600 dark:text-green-400" },
  { value: "activity", label: "Activity", icon: Ticket, color: "text-purple-600 dark:text-purple-400" },
  { value: "shopping", label: "Shopping", icon: ShoppingBag, color: "text-pink-600 dark:text-pink-400" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-muted-foreground" },
];

function categoryMeta(value: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

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
  /** B11: live FX rates so the dialog can show "≈ EUR 12" under the
   *  amount while the user types in a non-base currency. */
  fxRates?: RateBundle | null;
}

export function AddExpenseDialog({
  tripId,
  baseCurrency,
  tripBudget,
  sharedSpent,
  personalBudget,
  personalSpent,
  memberCount,
  fxRates = null,
}: Props) {
  const currencyOptions = Array.from(
    new Set([baseCurrency, ...COMMON_CURRENCIES]),
  );
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // B2 Budget v2 — Shared splits across the crew; Personal is your own
  // pocket money (no splits, just counts toward your personal budget).
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  // Local mirror of the amount input so the live-projection pill can
  // recompute on every keystroke without dragging in a controlled form.
  const [amountInput, setAmountInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState(baseCurrency);
  // B4: smart-category auto-detect. Description text → category via the
  // keyword dictionary. User can override via the dropdown; we keep the
  // override in state so manual choices stick.
  const [description, setDescription] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<ExpenseCategory | null>(null);
  // B12: optional receipt image (Splitwise-style). URL after upload,
  // null otherwise. Uploading flag drives the spinner on the chip.
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const inferred = inferCategory(description);
  const category: ExpenseCategory = categoryOverride ?? inferred;
  const catMeta = categoryMeta(category);
  const CatIcon = catMeta.icon;

  // B12: upload a receipt image straight from the dialog. Mirrors the
  // pattern in AddDocumentDialog — pre-signs in the trip-documents
  // bucket, returns the public URL we stash on the expense row.
  async function handleReceiptPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Receipts must be images (jpg, png, heic)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Receipt is too big — keep it under 10 MB");
      return;
    }
    setReceiptUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `${user.id}/${tripId}/receipt-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("trip-documents")
        .upload(path, file, { cacheControl: "3600", contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("trip-documents").getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setReceiptUploading(false);
    }
  }

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
        toast.success(t("expenses.loggedToast"));
        track.expenseLogged(tripId, baseCurrency);
        // Tester finding: the chat sidebar's auto-posted expense card
        // was lagging behind the create flow by up to 10s (the polling
        // window). Dispatch a custom event so the open ChatSidebar can
        // refetch immediately; harmless if no sidebar is mounted.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("paxawa:chat-refresh"));
        }
        // B13a: see note on votes' CreateVoteDialog — flushSync makes
        // the close commit before revalidatePath's Suspense refresh.
        flushSync(() => {
          setOpen(false);
        });
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error((err as Error).message || "Failed to log expense");
      }
    });
  }

  // B10: form ref so the BottomSheet footer's Submit button (which
  // lives outside the <form> in the JSX tree) can still trigger submit.
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />{t("expenses.logExpense")}
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("expenses.logTitle")}
        size="md"
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={isPending}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {isPending ? t("expenses.loggingToast") : t("expenses.logExpense")}
            </Button>
          </div>
        }
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="splitType" value="equal" />
          <input type="hidden" name="scope" value={scope} />
          {/* Smart-category submission — the dropdown can override, otherwise
              this carries the inferred value. */}
          <input type="hidden" name="category" value={category} />
          {/* B12: receipt URL travels with the form submit. */}
          <input type="hidden" name="receiptUrl" value={receiptUrl ?? ""} />

          {/* B4: description first, with a live category icon next to it.
              The icon flips as the user types (burger → Food, uber →
              Transport). Tap the icon to open the override menu. */}
          <div className="rounded-2xl border border-border bg-background px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <CategoryPicker
                value={category}
                inferred={inferred}
                onChange={(v) => setCategoryOverride(v)}
              />
              <input
                id="title"
                name="title"
                placeholder={t("expenses.whatWasThis")}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* B4: amount as the centerpiece. Big borderless field on a
              soft card — feels like a fresh receipt. Currency picker is a
              compact suffix so the eye reads "120 USD" naturally.

              B11: live "≈ EUR …" hint shows the moment the user types an
              amount in a non-base currency. Was completely missing
              because the FX upstream silently 200'd with success:false;
              fixed in lib/fx.ts. */}
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-baseline gap-2">
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9٠-٩۰-۹.,]*"
                placeholder="0"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-3xl font-bold tabular-nums tracking-tight placeholder:text-muted-foreground/40 focus:outline-none"
              />
              <select
                id="currency"
                name="currency"
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                className="shrink-0 rounded-lg bg-background border border-border px-2 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <LiveFxHint
              amountInput={amountInput}
              currency={currencyInput}
              baseCurrency={baseCurrency}
              fxRates={fxRates}
            />
          </div>

          {/* B2 Budget v2 — live projection. */}
          <BudgetProjection
            amountInput={amountInput}
            currencyInput={currencyInput}
            baseCurrency={baseCurrency}
            fxRates={fxRates}
            scope={scope}
            memberCount={memberCount}
            tripBudget={tripBudget}
            sharedSpent={sharedSpent}
            personalBudget={personalBudget}
            personalSpent={personalSpent}
          />

          {/* B4: scope as a two-button row, full width — easier to thumb
              on mobile than the floating pill. Caption sits below. */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setScope("shared")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                scope === "shared"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> {t("expenses.sharedSplitEqually")}
            </button>
            <button
              type="button"
              onClick={() => setScope("personal")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                scope === "personal"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5" /> {t("expenses.personalJustYou")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="expenseDate" className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{t("expenses.date")}</Label>
              <Input id="expenseDate" name="expenseDate" type="date" required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{t("expenses.notes")}</Label>
              <Input id="notes" name="notes" placeholder={t("expenses.notesOptional")} className="h-9" />
            </div>
          </div>

          {/* B12: Splitwise-style receipt attach. Optional; uploads to
              the trip-documents bucket, stashes the public URL on the
              expense. Thumbnail preview with an X to remove. */}
          <div>
            <Label className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block">
              {t("expenses.receipt")}
            </Label>
            {receiptUrl ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptUrl}
                  alt="Receipt"
                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">Receipt attached</p>
                  <p className="text-[10px] text-muted-foreground">Will show on the expense detail</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptUrl(null)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  aria-label="Remove receipt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="receipt-file"
                className="flex items-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-accent/30 px-3 py-2.5 cursor-pointer transition-colors"
              >
                {receiptUploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                ) : (
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs font-bold text-muted-foreground">
                  {receiptUploading ? t("common.loading") : t("expenses.addReceipt")}
                </span>
                <input
                  id="receipt-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReceiptPick}
                  disabled={receiptUploading}
                />
              </label>
            )}
          </div>

        </form>
      </BottomSheet>
    </>
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
  fxRates,
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
  fxRates: RateBundle | null;
  scope: "shared" | "personal";
  memberCount: number;
  tripBudget: number | null;
  sharedSpent: number;
  personalBudget: number | null;
  personalSpent: number;
}) {
  const parsed = parseFloat(normalizeDigits(amountInput));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  // B12-followup: when the expense is in a non-base currency, FX-convert
  // to baseCurrency so the projection reflects the actual budget impact.
  // Previously this branch bailed with a "Budget projection skipped"
  // message — but the server-side budget tracker DOES apply live FX, so
  // the dialog was lying to the user. If rates are missing (FX provider
  // down), keep the original honest fallback.
  let baseAmount = parsed;
  if (currencyInput !== baseCurrency) {
    const converted = convert(parsed, currencyInput, baseCurrency, fxRates);
    if (converted == null) {
      return (
        <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-1.5">
          Live FX unavailable — projection skipped. Submitting still works.
        </p>
      );
    }
    baseAmount = converted;
  }

  // Trip projection — only meaningful for shared expenses.
  const tripImpact = scope === "shared" ? baseAmount : 0;
  const tripProjected = sharedSpent + tripImpact;

  // Personal projection — full amount for personal, your-share for shared.
  const personalImpact =
    scope === "personal"
      ? baseAmount
      : memberCount > 0
        ? baseAmount / memberCount
        : baseAmount;
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

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * B4: leading category icon button on the description input. Auto-set
 * from the keyword dictionary while the user types; tap it to open a
 * small chooser that overrides. Shows a tiny "auto" dot when the
 * displayed icon comes from inference (not a manual choice) so the
 * user sees the smart pick at work.
 */
function CategoryPicker({
  value,
  inferred,
  onChange,
}: {
  value: ExpenseCategory;
  inferred: ExpenseCategory;
  onChange: (v: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = categoryMeta(value);
  const Icon = meta.icon;
  const isInferred = value === inferred;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={isInferred ? `Auto: ${meta.label}` : meta.label}
        className="relative w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
      >
        <Icon className={`w-4 h-4 ${meta.color}`} />
        {isInferred && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-background"
            title="Auto-detected"
          />
        )}
      </button>
      {open && (
        <div
          className="absolute z-50 top-full mt-1 left-0 rounded-xl border border-border bg-popover shadow-lg p-1 w-44"
          onMouseLeave={() => setOpen(false)}
        >
          {CATEGORIES.map((c) => {
            const CIcon = c.icon;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => { onChange(c.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors text-left ${
                  c.value === value ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <CIcon className={`w-3.5 h-3.5 ${c.color}`} />
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * B11: tiny pill that shows "≈ EUR 12.34" under the amount input when
 * the user is typing in a non-base currency. Silent when the trip
 * currency matches OR rates are missing — degrades cleanly.
 */
function LiveFxHint({
  amountInput,
  currency,
  baseCurrency,
  fxRates,
}: {
  amountInput: string;
  currency: string;
  baseCurrency: string;
  fxRates: RateBundle | null;
}) {
  if (currency === baseCurrency) return null;
  const parsed = parseFloat(normalizeDigits(amountInput));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const converted = convert(parsed, currency, baseCurrency, fxRates);
  if (converted == null) return null;
  return (
    <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
      ≈ {baseCurrency} {fmtAmount(converted)}{" "}
      <span className="opacity-60">· live FX</span>
    </p>
  );
}
