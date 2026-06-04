"use client";

import { useState, useEffect } from "react";
import { Hotel, Wifi, X, ArrowUpRight, Info } from "lucide-react";
import { useT } from "@/components/i18n/locale-provider";
import {
  buildBookingLink,
  buildAiraloLink,
  detectCountryForAiralo,
} from "@/lib/affiliate/build-link";
import { differenceInCalendarDays, parseISO, isPast } from "date-fns";

/**
 * Inline affiliate modules on the trip overview. Two slim cards stacked:
 *
 *  1. Booking.com hotel search — pre-filled with destination + dates +
 *     guest count. Always shows for upcoming trips, dismissible per-trip.
 *  2. Airalo eSIM — shows only inside the 7-day pre-trip window, when we
 *     can detect a country for the destination. Dismissible per-trip.
 *
 * Both are dismissible via a small × → we persist the choice in
 * localStorage scoped to the trip so the user can hide it and never see
 * it again on that trip. Per the UX rule we agreed on, neither card
 * outweighs the primary action grid below — they sit one short row each.
 *
 * Preview mode: if the URL has `?previewAffiliate=1`, dismissal is
 * ignored and Airalo shows regardless of date — this is what we use to
 * demo the placement on trips that are far out.
 */
interface Props {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: number;
  currency: string;
  locale: "en" | "ar";
}

const DISMISS_KEY = (tripId: string, partner: string) =>
  `paxawa.affiliate.dismissed.${partner}.${tripId}`;

export function AffiliateStrip({
  tripId,
  destination,
  startDate,
  endDate,
  members,
  currency,
  locale,
}: Props) {
  const t = useT();
  const [bookingDismissed, setBookingDismissed] = useState(false);
  const [airaloDismissed, setAiraloDismissed] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Read localStorage + URL param on mount. We don't render anything
  // server-side because dismissal is client-only state — leaving the
  // strip blank for one frame is fine.
  useEffect(() => {
    setBookingDismissed(
      localStorage.getItem(DISMISS_KEY(tripId, "booking")) === "1",
    );
    setAiraloDismissed(
      localStorage.getItem(DISMISS_KEY(tripId, "airalo")) === "1",
    );
    const url = new URL(window.location.href);
    setPreviewMode(url.searchParams.get("previewAffiliate") === "1");
  }, [tripId]);

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const tripIsPast = isPast(end);
  const daysToStart = differenceInCalendarDays(start, new Date());
  const eSimWindow = previewMode || (daysToStart <= 7 && !tripIsPast);
  const hasAiraloCountry = !!detectCountryForAiralo(destination);

  const showBooking = !tripIsPast && (previewMode || !bookingDismissed);
  const showAiralo =
    !tripIsPast && eSimWindow && hasAiraloCountry && (previewMode || !airaloDismissed);

  if (!showBooking && !showAiralo) return null;

  function dismiss(partner: "booking" | "airalo") {
    localStorage.setItem(DISMISS_KEY(tripId, partner), "1");
    if (partner === "booking") setBookingDismissed(true);
    else setAiraloDismissed(true);
  }

  const bookingHref = buildBookingLink({
    destination,
    startDate,
    endDate,
    members,
    surface: "trip_overview_hero",
    tripId,
    currency,
    locale,
  });
  const airaloHref = buildAiraloLink({
    destination,
    surface: "trip_overview_esim",
    tripId,
  });

  return (
    <div className="space-y-2">
      {showBooking && (
        <a
          href={bookingHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/8 to-cyan-500/5 hover:from-blue-500/12 hover:to-cyan-500/8 p-3 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Hotel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-snug truncate">
              {t("affiliate.bookingTitle", { destination })}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("affiliate.bookingSub", { members })}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Info className="w-3 h-3" />
            {t("affiliate.disclosure")}
          </span>
          <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss("booking");
            }}
            className="w-6 h-6 rounded-full hover:bg-foreground/10 flex items-center justify-center shrink-0"
            aria-label={t("affiliate.dismiss")}
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </a>
      )}

      {showAiralo && (
        <a
          href={airaloHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-teal-500/5 hover:from-emerald-500/12 hover:to-teal-500/8 p-3 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-snug truncate">
              {t("affiliate.airaloTitle", { destination })}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {daysToStart > 0
                ? t("affiliate.airaloSubSoon", { days: daysToStart })
                : t("affiliate.airaloSubGeneric")}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Info className="w-3 h-3" />
            {t("affiliate.disclosure")}
          </span>
          <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dismiss("airalo");
            }}
            className="w-6 h-6 rounded-full hover:bg-foreground/10 flex items-center justify-center shrink-0"
            aria-label={t("affiliate.dismiss")}
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </a>
      )}
    </div>
  );
}
