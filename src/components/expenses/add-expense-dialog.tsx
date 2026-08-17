"use client";

import { protectedFileUrl } from "@/lib/storage-url";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { inferLocalCurrency } from "@/lib/country-currency";
import { convert, type RateBundle } from "@/lib/fx";
import { Plus, Bed, Airplane as Plane, ForkKnife as Utensils, Ticket, ShoppingBag, DotsThree as MoreHorizontal, Users, User, Receipt, X, CircleNotch as Loader2 } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/client";
import { useT, useLocale } from "@/components/i18n/locale-provider";

const CATEGORIES: { value: ExpenseCategory; labelKey: string; icon: React.ElementType; color: string }[] = [
  { value: "accommodation", labelKey: "expenses.catStay", icon: Bed, color: "text-blue-600 dark:text-blue-400" },
  { value: "transport", labelKey: "expenses.catTransport", icon: Plane, color: "text-orange-600 dark:text-orange-400" },
  { value: "food", labelKey: "expenses.catFood", icon: Utensils, color: "text-green-600 dark:text-green-400" },
  { value: "activity", labelKey: "expenses.catActivity", icon: Ticket, color: "text-purple-600 dark:text-purple-400" },
  { value: "shopping", labelKey: "expenses.catShopping", icon: ShoppingBag, color: "text-pink-600 dark:text-pink-400" },
  { value: "other", labelKey: "expenses.catOther", icon: MoreHorizontal, color: "text-muted-foreground" },
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

/** Today as a date-input value in the USER'S timezone — toISOString()
 *  would flip to yesterday/tomorrow around midnight. */
function localDateIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  /** Sprint 3 FIX-3/4: the crew, for the payer picker + custom splits. */
  members?: { userId: string; displayName: string; avatarUrl?: string | null }[];
  currentUserId?: string;
  /** Sprint 9 FIX-2A: trip destination — the picker defaults to the
   *  on-the-ground currency (SAR in Riyadh), not the trip's base. */
  destination?: string;
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
  members = [],
  currentUserId = "",
  destination = "",
}: Props) {
  const localCurrency = inferLocalCurrency(destination);
  const currencyOptions = Array.from(
    new Set([...(localCurrency ? [localCurrency] : []), baseCurrency, ...COMMON_CURRENCIES]),
  );
  const t = useT();
  const { isRtl } = useLocale();
  const [open, setOpen] = useState(false);
  // QA BUG-16: surfaced instead of the silent native re-focus.
  const [dateError, setDateError] = useState(false);

  // §1-G: the mobile FAB is gone (the bottom-nav right circle owns "log
  // expense" now). It dispatches this event to open the sheet.
  useEffect(() => {
    const openSheet = () => setOpen(true);
    window.addEventListener("paxawa:logExpense", openSheet);
    // Sprint 4 FIX-3: the + menu's pre-trip path lands on /money?add=expense
    // (typing a deposit, not photographing a bill). Strip the param right
    // away so a post-revalidate remount can't reopen the sheet.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("add") === "expense") {
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => window.removeEventListener("paxawa:logExpense", openSheet);
  }, []);

  const [isPending, startTransition] = useTransition();
  // B2 Budget v2 — Shared splits across the crew; Personal is your own
  // pocket money (no splits, just counts toward your personal budget).
  const [scope, setScope] = useState<"shared" | "personal">("shared");
  // Sprint 3 FIX-3: "someone else paid" — defaults to you.
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [payerOpen, setPayerOpen] = useState(false);
  // Sprint 3 FIX-4: equal | custom (custom = per-member amounts).
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  // Local mirror of the amount input so the live-projection pill can
  // recompute on every keystroke without dragging in a controlled form.
  const [amountInput, setAmountInput] = useState("");
  // Sprint 9 FIX-2A: you spend in the destination's currency far more
  // often than the trip's base — seed the picker with it when known.
  const [currencyInput, setCurrencyInput] = useState(localCurrency ?? baseCurrency);
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
      toast.error(t("form.receiptsMustBeImages"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("form.receiptTooBig"));
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
      setReceiptUrl(protectedFileUrl("trip-documents", path));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.failed"));
    } finally {
      setReceiptUploading(false);
    }
  }

  const payer = members.find((m) => m.userId === (paidBy || currentUserId));
  const parsedAmount = parseFloat(normalizeDigits(amountInput).replace(/,/g, "")) || 0;
  const equalShare = memberCount > 0 ? parsedAmount / memberCount : 0;
  // Sprint 3 FIX-4: allocation math for the custom editor.
  const allocated = members.reduce(
    (sum, m) => sum + (parseFloat(normalizeDigits(customAmounts[m.userId] ?? "")) || 0),
    0,
  );
  const allocationOk = scope !== "shared" || splitMode !== "custom" || Math.abs(allocated - parsedAmount) < 0.01;

  function resetCustomToEqual() {
    const share = memberCount > 0 ? (parsedAmount / memberCount).toFixed(2) : "0";
    setCustomAmounts(Object.fromEntries(members.map((m) => [m.userId, share])));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!allocationOk) {
      toast.error(t("expenses.allocationMismatch"));
      return;
    }
    const formData = new FormData(e.currentTarget);
    // Normalize Eastern Arabic / Persian numerals (٠١٢٣ / ۰۱۲۳) to ASCII so
    // type=number coercion on the server works regardless of locale.
    const rawAmount = (formData.get("amount") as string | null) ?? "";
    formData.set("amount", normalizeDigits(rawAmount));
    // Sprint 3 FIX-3/4: payer + split payload.
    formData.set("paidBy", paidBy || currentUserId);
    formData.set("splitType", scope === "shared" ? splitMode : "equal");
    if (scope === "shared" && splitMode === "custom") {
      formData.set(
        "customSplits",
        JSON.stringify(
          members.map((m) => ({
            userId: m.userId,
            amount: parseFloat(normalizeDigits(customAmounts[m.userId] ?? "")) || 0,
          })),
        ),
      );
    }
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
        // Fresh defaults for the next open.
        setPaidBy(currentUserId);
        setSplitMode("equal");
        setCustomAmounts({});
        setAmountInput("");
        setDescription("");
      } catch (err) {
        toast.error((err as Error).message || t("settings.failedToPostExpense"));
      }
    });
  }

  // B10: form ref so the BottomSheet footer's Submit button (which
  // lives outside the <form> in the JSX tree) can still trigger submit.
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      {/* Visual-fix brief: no floating FAB anywhere (Money page rule). The
          trigger is a plain inline button on desktop; on mobile the nav's
          right circle opens the sheet via paxawa:logExpense. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("expenses.logExpense")}
        className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 h-10 text-sm font-bold hover:opacity-90 active:scale-95 transition-transform"
      >
        <Plus className="w-4 h-4" />
        {t("expenses.logExpense")}
      </button>
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
              disabled={isPending || !allocationOk}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {isPending ? t("expenses.loggingToast") : t("expenses.logExpense")}
            </Button>
          </div>
        }
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="tripId" value={tripId} />
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
                dir={isRtl ? "rtl" : "ltr"}
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

          {/* Sprint 3 FIX-3: PAID BY — someone else can be the payer. */}
          {members.length > 1 && (
            <div className="rounded-2xl border border-border bg-background">
              <button
                type="button"
                onClick={() => setPayerOpen((v) => !v)}
                aria-expanded={payerOpen}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-start"
              >
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{t("expenses.paidBy")}</span>
                <span className="flex-1 inline-flex items-center gap-1.5 justify-end text-sm font-bold">
                  <PayerAvatar name={payer?.displayName ?? t("expenses.you")} avatarUrl={payer?.avatarUrl ?? null} />
                  {payer?.userId === currentUserId || !payer ? t("expenses.you") : payer.displayName}
                  <span aria-hidden className="text-muted-foreground">▾</span>
                </span>
              </button>
              {payerOpen && (
                <div className="border-t border-border p-2 flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const active = m.userId === (paidBy || currentUserId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => { setPaidBy(m.userId); setPayerOpen(false); }}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-full ps-1 pe-3 py-1 text-xs font-bold transition-all ${
                          active
                            ? "bg-primary/10 border border-primary/30 text-primary"
                            : "border border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <PayerAvatar name={m.displayName} avatarUrl={m.avatarUrl ?? null} />
                        {m.userId === currentUserId ? t("expenses.you") : m.displayName.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sprint 3 FIX-4: three-way split — Equal / Custom / Just me. */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => { setScope("shared"); setSplitMode("equal"); }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                scope === "shared" && splitMode === "equal"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> {t("expenses.splitEqual")}
            </button>
            <button
              type="button"
              onClick={() => {
                setScope("shared");
                setSplitMode("custom");
                if (Object.keys(customAmounts).length === 0) resetCustomToEqual();
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                scope === "shared" && splitMode === "custom"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersIcon /> {t("expenses.splitCustom")}
            </button>
            <button
              type="button"
              onClick={() => setScope("personal")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                scope === "personal"
                  ? "bg-primary/10 border border-primary/30 text-primary"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="w-3.5 h-3.5" /> {t("expenses.justMe")}
            </button>
          </div>

          {/* Sprint 3 FIX-4: per-member amount editor with a running total. */}
          {scope === "shared" && splitMode === "custom" && (
            <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2.5">
                  <PayerAvatar name={m.displayName} avatarUrl={m.avatarUrl ?? null} />
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">
                    {m.userId === currentUserId ? t("expenses.you") : m.displayName.split(" ")[0]}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmounts[m.userId] ?? ""}
                    onChange={(e) =>
                      setCustomAmounts((prev) => ({ ...prev, [m.userId]: e.target.value.replace(/[^0-9٠-٩۰-۹.,]/g, "") }))
                    }
                    aria-label={m.displayName}
                    className="w-24 h-9 rounded-lg border border-border bg-card px-2 text-sm font-bold tabular-nums text-end focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <button type="button" onClick={resetCustomToEqual} className="text-[12px] font-bold text-primary">
                  {t("expenses.resetEqual")}
                </button>
                <span className={`text-[12px] font-bold tabular-nums ${allocationOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {t("expenses.allocated", { allocated: fmtAmount(allocated), total: fmtAmount(parsedAmount) })}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="expenseDate" className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                {t("expenses.date")} <span aria-hidden className="text-destructive">*</span>
              </Label>
              {/* Sprint 9 FIX-8: a repeatedly-filled form defaults to today
                  (local date, not UTC) — the user can still change it. */}
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                required
                aria-required="true"
                defaultValue={localDateIso()}
                onInvalid={(e) => { e.preventDefault(); setDateError(true); e.currentTarget.focus(); }}
                onChange={() => setDateError(false)}
                className={`h-9 ${dateError ? "border-destructive ring-1 ring-destructive" : ""}`}
              />
              {dateError && (
                <p className="text-[11px] font-semibold text-destructive">{t("expenses.dateRequired")}</p>
              )}
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
  const t = useT();
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
              ? t("expenses.projAfterPersonal")
              : t("expenses.projAfterShare")
          }
          projected={personalProjected}
          cap={personalBudget!}
          currency={baseCurrency}
          impact={personalImpact}
        />
      )}
      {showTrip && (
        <ProjectionLine
          label={t("expenses.projAfterTrip")}
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
          <span className="text-foreground/70 ms-1.5 tabular-nums">
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
  const t = useT();
  const [open, setOpen] = useState(false);
  // QA BUG-16: surfaced instead of the silent native re-focus.
  const [dateError, setDateError] = useState(false);
  const meta = categoryMeta(value);
  const Icon = meta.icon;
  const isInferred = value === inferred;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={isInferred ? t("expenses.autoPrefix", { label: t(meta.labelKey) }) : t(meta.labelKey)}
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
                {t(c.labelKey)}
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

/** Sprint 3 FIX-3/4: tiny avatar chip for the payer picker + split editor. */
function PayerAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
  ) : (
    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 uppercase">
      {name.charAt(0)}
    </span>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="4" y1="8" x2="20" y2="8" /><circle cx="9" cy="8" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="16" x2="20" y2="16" /><circle cx="15" cy="16" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
