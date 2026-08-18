"use client";

import { useState, useMemo, useEffect } from "react";
import { Sparkle as Sparkles, Users, Lock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
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
interface Props {
  userId: string;
  tripName?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  /**
   * B24-followup: embedded mode for the unified Bookings page. Skips the
   * page-level trip context line, the big "WALLET / total spend" tile,
   * and the forward-emails footer hint — the parent BookingsBoard owns
   * those so the page reads as one coherent surface instead of two
   * stacked sub-pages.
   */
  embedded?: boolean;
  /**
   * When embedded, the wrapper passes the dollar total down so the page
   * header can show one unified spend figure instead of two.
   */
  onTotalsReady?: (total: number, currency: string, count: number) => void;
}

export function WalletBoard({
  userId: _userId,
  tripName,
  destination,
  startDate,
  endDate,
  embedded = false,
}: Props) {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  // Track the most-recently-confirmed booking so we can pulse its card —
  // the visible "loop close" from Plan/Book mode (audit fix #4).
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Look for a fresh-add marker dropped by Book mode's
      // confirmBooking, scoped to this trip.
      const raw = Object.keys(localStorage)
        .filter((k) => k.startsWith("paxawa.walletNew."))
        .map((k) => localStorage.getItem(k))
        .filter(Boolean)
        .map((s) => {
          try {
            return JSON.parse(s as string) as { id: string; at: number };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as { id: string; at: number }[];
      const fresh = raw.find((r) => Date.now() - r.at < 60_000);
      if (fresh) {
        // Map a booking-intent id (e.g. "hotel-Kuala Lumpur") to a mock
        // booking type. We just pulse the matching type for the demo.
        const target = MOCK_BOOKINGS.find((b) =>
          fresh.id.startsWith(b.type) || b.id === fresh.id,
        );
        if (target) {
          setHighlightId(target.id);
          setTimeout(() => setHighlightId(null), 4500);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // B17 (audit fix #5): group by visibility — "Crew items" (everyone
  // sees: hotels, group flights, group activities) vs "Your items"
  // (private to you: eSIM, personal flight). Cleaner mental model than
  // a flat list with a 3-way scope filter.
  const crewItems = useMemo(
    () => MOCK_BOOKINGS.filter((b) => b.visibility === "crew"),
    [],
  );
  const yourItems = useMemo(
    () => MOCK_BOOKINGS.filter((b) => b.visibility === "private"),
    [],
  );

  // Pull the first upcoming flight from crew items as the hero anchor.
  const heroFlight = crewItems.find((b) => b.type === "flight");
  const crewRest = crewItems.filter((b) => b.id !== heroFlight?.id);

  const totalSpend = MOCK_BOOKINGS.reduce((s, b) => s + b.price, 0);
  const currency = MOCK_BOOKINGS[0]?.currency ?? "SAR";

  const opened = MOCK_BOOKINGS.find((b) => b.id === openId) ?? null;

  const dateRange = startDate && endDate
    ? `${format(parseDateOnly(startDate), "d MMM")} – ${format(parseDateOnly(endDate), "d MMM yyyy")}`
    : "";

  return (
    <div className={embedded ? "space-y-5" : "space-y-5 max-w-2xl mx-auto"}>
      {!embedded && tripName && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="font-bold text-foreground truncate">{tripName}</span>
          {destination && <span>· {destination}</span>}
          {dateRange && <span>· {dateRange}</span>}
        </div>
      )}

      {!embedded && (
        <div>
          <p className="text-[12px] font-bold tracking-widest uppercase text-muted-foreground">
            {t("wallet.section")}
          </p>
          <p className="text-3xl font-extrabold tabular-nums">
            {currency} {totalSpend.toLocaleString()}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {t("wallet.totalLine", { count: MOCK_BOOKINGS.length })}
          </p>
        </div>
      )}

      {/* Crew items — visible to everyone on the trip */}
      {crewItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-[12px] font-extrabold tracking-widest uppercase text-blue-600 dark:text-blue-400">
              {t("wallet.crewSection")}
            </p>
            <span className="text-[10px] text-muted-foreground">· {t("wallet.crewSectionMeta")}</span>
          </div>
          {heroFlight && (
            <div className={highlightId === heroFlight.id ? "animate-pulse" : ""}>
              <WalletCard booking={heroFlight} variant="hero" onOpen={setOpenId} />
            </div>
          )}
          {crewRest.map((b) => (
            <div key={b.id} className={highlightId === b.id ? "animate-pulse" : ""}>
              <WalletCard booking={b} onOpen={setOpenId} />
            </div>
          ))}
        </section>
      )}

      {/* Your private items — only visible to you (eSIM, personal tickets) */}
      {yourItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <p className="text-[12px] font-extrabold tracking-widest uppercase text-amber-600 dark:text-amber-400">
              {t("wallet.yoursSection")}
            </p>
            <span className="text-[10px] text-muted-foreground">· {t("wallet.yoursSectionMeta")}</span>
          </div>
          {yourItems.map((b) => (
            <div key={b.id} className={highlightId === b.id ? "animate-pulse" : ""}>
              <WalletCard booking={b} onOpen={setOpenId} />
            </div>
          ))}
        </section>
      )}

      {MOCK_BOOKINGS.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-8 text-center space-y-2">
          <Sparkles className="w-8 h-8 mx-auto opacity-30" />
          <p className="text-sm font-bold">{t("wallet.emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("wallet.emptySub")}</p>
        </div>
      )}

      {!embedded && (
        <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-snug">{t("wallet.forwardTitle")}</p>
            <p className="text-[12px] text-muted-foreground truncate">{t("wallet.forwardSub")}</p>
          </div>
          <button
            type="button"
            className="text-[12px] font-bold text-primary hover:opacity-80 shrink-0"
          >
            {t("wallet.copyAddress")}
          </button>
        </div>
      )}

      <WalletDetailSheet booking={opened} onClose={() => setOpenId(null)} />
    </div>
  );
}
