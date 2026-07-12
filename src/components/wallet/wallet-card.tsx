"use client";

import { Airplane as Plane, Buildings as Hotel, Train, Bus, WifiHigh as Wifi, Ticket, Users, Lock, CaretRight as ChevronRight, Star } from "@phosphor-icons/react/dist/ssr";
import type { MockBooking, BookingType } from "./mock-bookings";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Single wallet card. The visual style varies by type to match the
 * reference designs the user sent: flights/buses get the route-with-arc
 * treatment (FlixBus-style), hotels get a stay-row treatment, and
 * the highest-priority upcoming booking (the next flight) gets a
 * gradient hero card to anchor the list visually.
 *
 * Hero variant is applied at the list level — this component just takes
 * a `variant` prop and renders the right skin.
 */
interface Props {
  booking: MockBooking;
  variant?: "default" | "hero";
  onOpen: (id: string) => void;
}

/**
 * B22: turn a station name into a clean 3-letter code. Avoids picking
 * abbreviations that read as English words ("BUT", "AND", "FOR") — when
 * the natural prefix lands on a stop-word we pull from the second word
 * instead. Falls back to the city after the parenthesis ("Butterworth
 * (Penang)" → "PEN") when the station includes a city tag.
 */
const STATION_BLOCKLIST = new Set([
  "BUT", "AND", "FOR", "THE", "ARE", "WAS", "HAS", "HAD", "OUT", "OFF",
  "OWN", "TWO", "OUR", "ONE",
]);

function stationCode(stationName: string): string {
  // Prefer a city in parentheses — "Butterworth (Penang)" → "PEN"
  const paren = stationName.match(/\(([^)]+)\)/);
  if (paren) {
    const c = paren[1].trim().slice(0, 3).toUpperCase();
    if (!STATION_BLOCKLIST.has(c)) return c;
  }
  const words = stationName.replace(/[()]/g, "").split(/\s+/).filter(Boolean);
  // Multi-word: prefer initials so "KL Sentral" → "KLS",
  // "Kuala Lumpur Central" → "KLC". Reads as a real station code.
  if (words.length >= 2) {
    const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 3);
    if (initials.length >= 2 && !STATION_BLOCKLIST.has(initials)) return initials;
  }
  // Single word: take first 3, skipping stop-words like "BUT".
  for (const w of words) {
    const c = w.slice(0, 3).toUpperCase();
    if (c.length === 3 && !STATION_BLOCKLIST.has(c) && /^[A-Z]+$/.test(c)) {
      return c;
    }
  }
  return stationName.slice(0, 3).toUpperCase();
}

const ICONS: Record<BookingType, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  hotel: Hotel,
  train: Train,
  bus: Bus,
  esim: Wifi,
  activity: Ticket,
};

export function WalletCard({ booking, variant = "default", onOpen }: Props) {
  const t = useT();
  const Icon = ICONS[booking.type];

  // Hero variant — colorful gradient card, used for the next upcoming
  // flight to anchor the list (matches image 3 reference).
  if (variant === "hero" && booking.type === "flight" && booking.flight) {
    const f = booking.flight;
    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl overflow-hidden relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow"
      >
        {/* Top row: airport codes + plane icon */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-4xl font-extrabold tracking-tight tabular-nums">{f.fromCode}</p>
          <Plane className="w-6 h-6 opacity-90 rtl:rotate-180" />
          <p className="text-4xl font-extrabold tracking-tight tabular-nums">{f.toCode}</p>
        </div>
        {/* Times row */}
        <div className="flex items-center justify-between text-sm font-medium opacity-90 mb-3">
          <p className="tabular-nums">↗ {f.depTime}</p>
          <p className="text-xs bg-white/15 backdrop-blur-sm rounded-full px-2 py-0.5 tabular-nums">
            {f.durationLabel}
          </p>
          <p className="tabular-nums">↘ {f.arrTime}</p>
        </div>
        <div className="h-px bg-white/20 mb-3" />
        {/* Airline + price row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Plane className="w-3.5 h-3.5 rtl:rotate-180" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{f.airlineName}</p>
              <p className="text-[11px] opacity-80 truncate">
                {t("wallet.flightNo")} {f.flightNumber}
              </p>
            </div>
          </div>
          <p className="text-xl font-extrabold tabular-nums">
            {booking.currency} {booking.price.toLocaleString()}
          </p>
        </div>
      </button>
    );
  }

  // Bus / train variant — route-with-arc layout matching the FlixBus
  // reference (image 1). Times left/right, dashed arc + duration in
  // the middle, partner badge, passenger count, price + chevron CTA.
  if (booking.type === "bus" || booking.type === "train") {
    const r =
      booking.type === "bus"
        ? booking.bus!
        : { fromCode: stationCode(booking.train!.fromStation), toCode: stationCode(booking.train!.toStation), depTime: booking.train!.depTime, arrTime: booking.train!.arrTime, durationLabel: booking.train!.durationLabel, operator: booking.train!.operator, seat: booking.train!.seat, rating: undefined as number | undefined };

    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl bg-card border border-border p-4 hover:border-foreground/15 transition-colors space-y-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-base truncate">{r.operator}</p>
          {r.rating != null && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full shrink-0">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{r.rating}</span>
            </span>
          )}
          <VisibilityChip visibility={booking.visibility} />
        </div>

        {/* Route arc — times left/right, dashed curve + duration in middle */}
        <div className="grid grid-cols-3 items-center text-center">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              {r.fromCode}
            </p>
            <p className="text-2xl font-extrabold tabular-nums">{r.depTime}</p>
          </div>
          <div className="relative h-10 flex items-center justify-center">
            <svg viewBox="0 0 100 40" className="absolute inset-0 w-full h-full text-muted-foreground/40">
              <path
                d="M 5 30 Q 50 -5 95 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </svg>
            <span className="relative bg-card px-2 text-[11px] font-bold text-muted-foreground tabular-nums">
              {r.durationLabel}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted-foreground">
              {r.toCode}
            </p>
            <p className="text-2xl font-extrabold tabular-nums">{r.arrTime}</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/8 px-2.5 py-1 rounded-full">
            <Ticket className="w-3 h-3" />
            {t("wallet.mTicket")}
          </span>
          {r.seat && (
            <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
              {t("wallet.seat")} {r.seat}
            </span>
          )}
          <div className="flex items-center gap-2 ms-auto">
            <p className="text-lg font-extrabold tabular-nums">
              {booking.currency} {booking.price.toLocaleString()}
            </p>
            <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Flight (default, non-hero) — slim clean card
  if (booking.type === "flight" && booking.flight) {
    const f = booking.flight;
    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl bg-card border border-border p-4 hover:border-foreground/15 transition-colors space-y-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-extrabold tabular-nums">{f.fromCode}</p>
          <Plane className="w-5 h-5 text-muted-foreground rtl:rotate-180" />
          <p className="text-2xl font-extrabold tabular-nums">{f.toCode}</p>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">↗ {f.depTime}</span>
          <span className="text-xs tabular-nums">{f.durationLabel}</span>
          <span className="tabular-nums">↘ {f.arrTime}</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center shrink-0">
              <Plane className="w-3.5 h-3.5 text-rose-500 rtl:rotate-180" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{f.airlineName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("wallet.flightNo")} {f.flightNumber}
              </p>
            </div>
          </div>
          <p className="text-lg font-extrabold tabular-nums">
            {booking.currency} {booking.price.toLocaleString()}
          </p>
        </div>
      </button>
    );
  }

  // Hotel — wider row, building icon, stay info
  if (booking.type === "hotel" && booking.hotel) {
    const h = booking.hotel;
    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl bg-gradient-to-br from-card to-card/60 border border-border p-4 hover:border-foreground/15 transition-colors shadow-sm"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Hotel className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-base truncate">{booking.title}</p>
              <VisibilityChip visibility={booking.visibility} />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{booking.partner}</p>
          </div>
          <p className="text-lg font-extrabold tabular-nums shrink-0">
            {booking.currency} {booking.price.toLocaleString()}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t("wallet.checkIn")} value={h.checkIn.split(" · ")[0]} />
          <Stat label={t("wallet.checkOut")} value={h.checkOut.split(" · ")[0]} />
          <Stat label={t("wallet.nights")} value={`${h.nights} · ${h.guests}p`} />
        </div>
      </button>
    );
  }

  // eSIM — distinct emerald style, "private" badge prominent
  if (booking.type === "esim" && booking.esim) {
    const e = booking.esim;
    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl bg-gradient-to-br from-emerald-500/8 to-teal-500/5 border border-emerald-500/30 p-4 hover:border-emerald-500/50 transition-colors space-y-3 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base truncate">{e.country}</p>
              <p className="text-[11px] text-muted-foreground truncate">{booking.partner}</p>
            </div>
          </div>
          <VisibilityChip visibility={booking.visibility} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={t("wallet.data")} value={e.dataAllowance} />
          <Stat label={t("wallet.validity")} value={e.validity} />
          <Stat label={t("wallet.price")} value={`${booking.currency} ${booking.price}`} />
        </div>
      </button>
    );
  }

  // Activity / tour
  if (booking.type === "activity" && booking.activity) {
    const a = booking.activity;
    return (
      <button
        type="button"
        onClick={() => onOpen(booking.id)}
        className="text-start w-full rounded-3xl bg-card border border-border p-4 hover:border-foreground/15 transition-colors shadow-sm"
      >
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-base truncate">{booking.title}</p>
              <VisibilityChip visibility={booking.visibility} />
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {booking.partner} · {a.duration} · {a.guests} {t("wallet.guests")}
            </p>
          </div>
          <p className="text-lg font-extrabold tabular-nums shrink-0">
            {booking.currency} {booking.price.toLocaleString()}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{a.startTime}</p>
      </button>
    );
  }

  // Fallback — shouldn't render in practice
  return (
    <button
      type="button"
      onClick={() => onOpen(booking.id)}
      className="text-start w-full rounded-3xl bg-card border border-border p-4 hover:border-foreground/15 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <p className="font-bold text-sm">{booking.title}</p>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-1.5">
      <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-xs font-extrabold tabular-nums truncate">{value}</p>
    </div>
  );
}

function VisibilityChip({ visibility }: { visibility: "crew" | "private" }) {
  const t = useT();
  if (visibility === "private") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
        <Lock className="w-2.5 h-2.5" />
        {t("wallet.private")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full shrink-0">
      <Users className="w-2.5 h-2.5" />
      {t("wallet.crew")}
    </span>
  );
}
