"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, User, Users, Pencil, Check, X, TrendUp as TrendingUp } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { setPersonalBudget } from "@/lib/actions/budget";
import { normalizeDigits, fmtAmount } from "@/lib/numerals";

/**
 * Budget-health card. Lives at the top of the expenses page (B2 Budget v2).
 *
 *   - Left card: trip-shared budget cap vs spent (sum of shared expenses).
 *   - Right card: this member's personal budget vs their spend (their own
 *     personal-scope expenses + their share of shared splits).
 *
 * Each card shows a progress bar with threshold coloring (75% amber,
 * 90% red, 100%+ destructive). The personal-budget cap can be edited
 * inline by tapping the Pencil icon — no settings detour.
 *
 * All math is per-currency aware: if the trip has mixed currencies, we
 * show the trip's base-currency totals only (cross-currency aggregation
 * needs FX rates, which is a B3 item). A small "MXN only" pill flags
 * this when relevant.
 */

interface Props {
  tripId: string;
  baseCurrency: string;
  /** Trip-level cap set by the owner. NULL = no cap. */
  tripBudget: number | null;
  /** Sum of shared-scope expenses in baseCurrency (already filtered). */
  sharedSpent: number;
  /** Current user's personal budget cap (B2 column). NULL = unset. */
  personalBudget: number | null;
  /** Current user's own spend in baseCurrency: personal-scope + their
   *  share of shared splits. */
  personalSpent: number;
  /** True when expenses span multiple currencies; we only display base. */
  multiCurrency: boolean;
}

export function BudgetHealth({
  tripId,
  baseCurrency,
  tripBudget,
  sharedSpent,
  personalBudget,
  personalSpent,
  multiCurrency,
}: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {/* Shared / trip-wide budget */}
      <HealthCard
        icon={<Users className="w-3.5 h-3.5" />}
        label="Trip budget"
        currency={baseCurrency}
        cap={tripBudget}
        spent={sharedSpent}
        multiCurrency={multiCurrency}
        tint="indigo"
      />
      {/* Personal pocket-money budget */}
      <PersonalCard
        tripId={tripId}
        baseCurrency={baseCurrency}
        personalBudget={personalBudget}
        personalSpent={personalSpent}
        multiCurrency={multiCurrency}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function HealthCard({
  icon,
  label,
  currency,
  cap,
  spent,
  multiCurrency,
  tint,
  rightSlot,
}: {
  icon: React.ReactNode;
  label: string;
  currency: string;
  cap: number | null;
  spent: number;
  multiCurrency: boolean;
  tint: "indigo" | "emerald";
  rightSlot?: React.ReactNode;
}) {
  const pct = cap && cap > 0 ? (spent / cap) * 100 : 0;
  const colors = thresholdColors(pct, tint);

  return (
    <div className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-4 overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className={colors.icon}>{icon}</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
        </div>
        {rightSlot}
      </div>

      {cap == null || cap === 0 ? (
        <div>
          <p className="text-lg font-bold tabular-nums">
            {currency} {fmtAmount(spent)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            No cap set · just tracking
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold tabular-nums">
              {currency} {fmtAmount(spent)}
            </p>
            <p className="text-xs font-bold tabular-nums text-muted-foreground">
              of {fmtAmount(cap)}
            </p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className={`h-full me-auto ${colors.bar} transition-all duration-500`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className={`font-bold ${colors.label}`}>
              {fmtAmount(pct)}%
            </span>
            <span className="text-muted-foreground tabular-nums">
              {cap - spent >= 0
                ? `${currency} ${fmtAmount(cap - spent)} left`
                : `${currency} ${fmtAmount(spent - cap)} over`}
            </span>
          </div>
        </>
      )}

      {multiCurrency && (
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 rounded-full px-1.5 py-0.5">
          <TrendingUp className="w-2.5 h-2.5" />
          {currency} only
        </span>
      )}
    </div>
  );
}

function PersonalCard({
  tripId,
  baseCurrency,
  personalBudget,
  personalSpent,
  multiCurrency,
}: {
  tripId: string;
  baseCurrency: string;
  personalBudget: number | null;
  personalSpent: number;
  multiCurrency: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(
    personalBudget != null ? String(personalBudget) : "",
  );
  const [isPending, startTransition] = useTransition();

  function commit() {
    const fd = new FormData();
    fd.set("tripId", tripId);
    fd.set("personalBudget", normalizeDigits(draft.trim()));
    startTransition(async () => {
      try {
        await setPersonalBudget(fd);
        toast.success(
          draft.trim().length === 0 || Number(draft) <= 0
            ? "Personal budget cleared"
            : "Personal budget updated",
        );
        setEditing(false);
      } catch (e: any) {
        toast.error(e?.message || "Couldn't save");
      }
    });
  }

  function cancel() {
    setDraft(personalBudget != null ? String(personalBudget) : "");
    setEditing(false);
  }

  // Personal card colored against personal budget; if unset, show
  // tracking-only state. Logic mirrors HealthCard, with an inline editor.
  const pct =
    personalBudget && personalBudget > 0
      ? (personalSpent / personalBudget) * 100
      : 0;
  const colors = thresholdColors(pct, "emerald");

  return (
    <div className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-4 overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className={colors.icon}>
            <User className="w-3.5 h-3.5" />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Your budget
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Edit personal budget"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {baseCurrency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9٠-٩۰-۹.,]*"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") cancel();
                }}
                placeholder="0 = clear"
                className="flex-1 min-w-0 bg-background/40 rounded-md px-2 py-1 text-base font-bold tabular-nums outline-none border border-border focus:border-primary/40"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={isPending}
                onClick={commit}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-bold py-1.5 transition-colors"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-muted/60 hover:bg-muted text-foreground text-[11px] font-bold py-1.5 px-3 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Only you see this. Set 0 to stop tracking.
            </p>
          </motion.div>
        ) : personalBudget == null || personalBudget === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-lg font-bold tabular-nums">
              {baseCurrency} {fmtAmount(personalSpent)}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Wallet className="w-2.5 h-2.5" />
              Set your personal budget
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="show"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-lg font-bold tabular-nums">
                {baseCurrency} {fmtAmount(personalSpent)}
              </p>
              <p className="text-xs font-bold tabular-nums text-muted-foreground">
                of {fmtAmount(personalBudget)}
              </p>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`h-full me-auto ${colors.bar} transition-all duration-500`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className={`font-bold ${colors.label}`}>
                {fmtAmount(pct)}%
              </span>
              <span className="text-muted-foreground tabular-nums">
                {personalBudget - personalSpent >= 0
                  ? `${baseCurrency} ${fmtAmount(personalBudget - personalSpent)} left`
                  : `${baseCurrency} ${fmtAmount(personalSpent - personalBudget)} over`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {multiCurrency && !editing && (
        <span className="absolute top-2 right-9 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 rounded-full px-1.5 py-0.5">
          {baseCurrency} only
        </span>
      )}
    </div>
  );
}

/* ─── Threshold colors ──────────────────────────────────────────────────
 * 0 → 75%: green (under), 75 → 90: amber, 90 → 100: red, 100+: destructive.
 * Two tints so the trip card reads differently from the personal card. */
function thresholdColors(
  pct: number,
  tint: "indigo" | "emerald",
): {
  border: string;
  bg: string;
  bar: string;
  icon: string;
  label: string;
} {
  if (pct >= 100) {
    return {
      border: "border-red-500/40",
      bg: "bg-red-500/[0.06]",
      bar: "bg-gradient-to-r from-red-500 to-rose-500",
      icon: "text-red-500",
      label: "text-red-500",
    };
  }
  if (pct >= 90) {
    return {
      border: "border-orange-500/40",
      bg: "bg-orange-500/[0.05]",
      bar: "bg-gradient-to-r from-orange-400 to-red-400",
      icon: "text-orange-500",
      label: "text-orange-500",
    };
  }
  if (pct >= 75) {
    return {
      border: "border-amber-500/40",
      bg: "bg-amber-500/[0.04]",
      bar: "bg-gradient-to-r from-amber-400 to-orange-400",
      icon: "text-amber-500",
      label: "text-amber-500",
    };
  }
  // Under 75% — tint-colored, calm.
  if (tint === "indigo") {
    return {
      border: "border-border/60",
      bg: "bg-card",
      bar: "bg-gradient-to-r from-indigo-400 to-violet-500",
      icon: "text-indigo-500",
      label: "text-foreground",
    };
  }
  return {
    border: "border-border/60",
    bg: "bg-card",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-500",
    icon: "text-emerald-500",
    label: "text-foreground",
  };
}
