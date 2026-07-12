"use client";

import { useEffect, useState } from "react";
import { Buildings as Hotel, Airplane as Plane, WifiHigh as Wifi, Ticket, Sparkle as Sparkles, FileText, Check, CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Mock "Bookings" rail for the trip overview. This is the visual we'd
 * show once the forwarded-email parser is live and we've added parsed
 * confirmations (hotels, flights, eSIMs, activities) to the trip.
 *
 * For now we render hardcoded sample data so the user can react to the
 * card design + layout before we build any real plumbing.
 *
 * Each booking card shows:
 *   - Type icon + color tint
 *   - Title (hotel/flight/etc. name)
 *   - Sub-line: dates or route
 *   - Price (in trip currency)
 *   - "Auto-added from email" badge (sells the email-parser story)
 *   - Confirmation chip with check icon
 *
 * Gated by ?previewAffiliate=1 so prod testers don't see mock data.
 */
interface Props {
  currency: string;
}

type BookingType = "hotel" | "flight" | "esim" | "activity";

interface MockBooking {
  id: string;
  type: BookingType;
  title: string;
  sub: string;
  price: number;
  confirmationCode: string;
  source: string;
  autoAdded: boolean;
}

const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: "b1",
    type: "hotel",
    title: "Mandarin Oriental Kuala Lumpur",
    sub: "Jul 10 – Jul 13 · 3 nights · 2 guests",
    price: 540,
    confirmationCode: "4129-8821-XX",
    source: "Booking.com",
    autoAdded: true,
  },
  {
    id: "b2",
    type: "flight",
    title: "RUH → KUL · Saudia SV848",
    sub: "Jul 10 · 02:15 → 16:40 · economy",
    price: 1280,
    confirmationCode: "PNR · JKQ9XR",
    source: "Almosafer",
    autoAdded: true,
  },
  {
    id: "b3",
    type: "esim",
    title: "Airalo · Malaysia 5GB",
    sub: "30 days · activates Jul 10",
    price: 34,
    confirmationCode: "AIR-2026-04412",
    source: "Airalo",
    autoAdded: true,
  },
  {
    id: "b4",
    type: "activity",
    title: "Batu Caves + Temple half-day tour",
    sub: "Jul 11 · 09:00 · 4 hours · 4 guests",
    price: 68,
    confirmationCode: "GYG-PAX-77123",
    source: "GetYourGuide",
    autoAdded: false,
  },
];

const TYPE_META: Record<
  BookingType,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    ring: string;
    labelKey: string;
  }
> = {
  hotel: {
    icon: Hotel,
    bg: "bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    ring: "border-blue-500/30",
    labelKey: "bookings.typeHotel",
  },
  flight: {
    icon: Plane,
    bg: "bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    ring: "border-violet-500/30",
    labelKey: "bookings.typeFlight",
  },
  esim: {
    icon: Wifi,
    bg: "bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "border-emerald-500/30",
    labelKey: "bookings.typeEsim",
  },
  activity: {
    icon: Ticket,
    bg: "bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    ring: "border-amber-500/30",
    labelKey: "bookings.typeActivity",
  },
};

export function BookingsRail({ currency }: Props) {
  const t = useT();
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    setPreviewMode(url.searchParams.get("previewAffiliate") === "1");
  }, []);

  if (!previewMode) return null;

  const total = MOCK_BOOKINGS.reduce((sum, b) => sum + b.price, 0);

  return (
    <section className="space-y-3">
      {/* Section header — mirrors the visual language of the action hub
          rows so this slots in without redesigning trip overview. */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-muted-foreground">
              {t("bookings.section")}
            </p>
            <p className="text-sm font-bold">
              {t("bookings.totalLine", {
                count: MOCK_BOOKINGS.length,
                currency,
                amount: total.toLocaleString(),
              })}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:opacity-80"
        >
          {t("bookings.viewAll")}
          <ChevronRight className="w-3 h-3 rtl:rotate-180" />
        </button>
      </div>

      {/* The cards — each one is a single tappable row with type icon,
          title, sub-line, price, and the "auto-added from email" badge
          that sells the future email-parser story. */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {MOCK_BOOKINGS.map((b) => {
          const meta = TYPE_META[b.type];
          const Icon = meta.icon;
          return (
            <button
              key={b.id}
              type="button"
              className={`group text-start rounded-2xl border ${meta.ring} bg-card hover:border-foreground/15 p-3 transition-colors`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                  {t(meta.labelKey)}
                </span>
                <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5" />
                  {t("bookings.confirmed")}
                </span>
              </div>
              <p className="font-bold text-sm leading-snug truncate mb-0.5">
                {b.title}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mb-2">
                {b.sub}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold tabular-nums">
                  {currency} {b.price.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums truncate">
                  {b.source} · {b.confirmationCode}
                </p>
              </div>
              {b.autoAdded && (
                <div className="mt-2 pt-2 border-t border-border/60 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  <p className="text-[10px] text-muted-foreground truncate">
                    {t("bookings.autoAdded")}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* "Forward your confirmations" hint — primes the user for the
          email-parser flow we'll build for real. */}
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold leading-snug">
            {t("bookings.forwardTitle")}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {t("bookings.forwardSub")}
          </p>
        </div>
        <button
          type="button"
          className="text-[11px] font-bold text-primary hover:opacity-80 shrink-0"
        >
          {t("bookings.copyAddress")}
        </button>
      </div>
    </section>
  );
}
