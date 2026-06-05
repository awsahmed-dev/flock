"use client";

import { useState, useMemo } from "react";
import { Sparkles, Filter, Plus, Mail } from "lucide-react";
import { MOCK_BOOKINGS, type MockBooking } from "./mock-bookings";
import { WalletCard } from "./wallet-card";
import { WalletDetailSheet } from "./wallet-detail-sheet";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Wallet list view. Top row: filter chips (All / Yours / Crew). Then a
 * "next up" hero card if a flight is in the list — anchors the eye
 * visually. Then the rest of the cards stacked. A "forward your
 * confirmations" empty-state / hint sits at the bottom as the entry
 * point for the future email-parser flow.
 *
 * Tapping any card opens the detail sheet (the ticket view with
 * barcode + download CTA — matches reference images 2 + 4).
 */
type ScopeFilter = "all" | "mine" | "crew";

export function WalletBoard({ userId: _userId }: { userId: string }) {
  const t = useT();
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (scope === "mine") return MOCK_BOOKINGS.filter((b) => b.visibility === "private" || b.addedBy.userId === "u1");
    if (scope === "crew") return MOCK_BOOKINGS.filter((b) => b.visibility === "crew");
    return MOCK_BOOKINGS;
  }, [scope]);

  // Pull the first upcoming flight out as the hero — everything else
  // renders in the default grid below it.
  const heroFlight = filtered.find((b) => b.type === "flight");
  const rest = filtered.filter((b) => b.id !== heroFlight?.id);

  const totalSpend = filtered.reduce((s, b) => s + b.price, 0);
  const currency = filtered[0]?.currency ?? "SAR";

  const opened = MOCK_BOOKINGS.find((b) => b.id === openId) ?? null;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Section header — total + scope filter */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
            {t("wallet.section")}
          </p>
          <p className="text-2xl font-extrabold tabular-nums">
            {currency} {totalSpend.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("wallet.totalLine", { count: filtered.length })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60">
          <ScopeChip active={scope === "all"} onClick={() => setScope("all")} label={t("wallet.scopeAll")} />
          <ScopeChip active={scope === "mine"} onClick={() => setScope("mine")} label={t("wallet.scopeMine")} />
          <ScopeChip active={scope === "crew"} onClick={() => setScope("crew")} label={t("wallet.scopeCrew")} />
        </div>
      </div>

      {/* "Add booking" pill row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-primary to-violet-600 text-white text-xs font-bold px-3 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("wallet.addManual")}
        </button>
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card hover:border-foreground/15 text-xs font-bold px-3 py-2 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          {t("wallet.forwardEmail")}
        </button>
      </div>

      {/* Hero flight + rest of cards */}
      <div className="space-y-3">
        {heroFlight && (
          <WalletCard booking={heroFlight} variant="hero" onOpen={setOpenId} />
        )}
        {rest.map((b) => (
          <WalletCard key={b.id} booking={b} onOpen={setOpenId} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center space-y-2">
          <Sparkles className="w-8 h-8 mx-auto opacity-30" />
          <p className="text-sm font-bold">{t("wallet.emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("wallet.emptySub")}</p>
        </div>
      )}

      {/* Forward-emails footer hint — the gateway to the future parser flow */}
      <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-snug">{t("wallet.forwardTitle")}</p>
          <p className="text-[11px] text-muted-foreground truncate">{t("wallet.forwardSub")}</p>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold text-primary hover:opacity-80 shrink-0"
        >
          {t("wallet.copyAddress")}
        </button>
      </div>

      {/* Footnote — explains the privacy chips inline so users get it
          without an FAQ. */}
      <p className="text-[10px] text-center text-muted-foreground px-4">
        {t("wallet.privacyHint")}
      </p>

      <WalletDetailSheet booking={opened} onClose={() => setOpenId(null)} />
      {void Filter}
    </div>
  );
}

function ScopeChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
