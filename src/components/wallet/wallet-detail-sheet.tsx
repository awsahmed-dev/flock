"use client";

import { SheetGrip, useDismissDrag } from "@/components/ui/sheet-grip";
import { useEffect, useState } from "react";
import { X, DownloadSimple as Download, ShareNetwork as Share2, Airplane as Plane, Buildings as Hotel, Train, Bus, WifiHigh as Wifi, Ticket, Calendar } from "@phosphor-icons/react/dist/ssr";
import type { MockBooking } from "./mock-bookings";
import { FakeBarcode } from "./barcode";
import { useT } from "@/components/i18n/locale-provider";

interface WalletImage {
  url: string;
  creditName: string;
  creditLink: string;
}

/**
 * Cache wallet detail photos for the session so opening the same
 * booking twice doesn't re-hit Unsplash. Keyed by the search query.
 */
const imageCache = new Map<string, WalletImage | null>();

function useWalletImage(query: string | null): WalletImage | null {
  const [photo, setPhoto] = useState<WalletImage | null>(
    query ? imageCache.get(query) ?? null : null,
  );
  useEffect(() => {
    if (!query) return;
    if (imageCache.has(query)) {
      setPhoto(imageCache.get(query) ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/wallet/image?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const value: WalletImage | null = data && data.url ? data : null;
        imageCache.set(query, value);
        if (!cancelled) setPhoto(value);
      })
      .catch(() => {
        imageCache.set(query, null);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);
  return photo;
}

/**
 * Full-screen-ish ticket detail. Slides up from the bottom on mobile,
 * centered modal on desktop. Visual reference: image 2 (FlixBus ticket)
 * and image 4 (train ticket with notches + barcode + Download CTA).
 *
 * The card uses a notched-edge shape (the classic torn-stub look) to
 * read as a ticket rather than another generic card. CSS-only, no SVG
 * masks needed — two pseudo-positioned circles on either side achieve it.
 */
interface Props {
  booking: MockBooking | null;
  onClose: () => void;
}

export function WalletDetailSheet({ booking, onClose }: Props) {
  const t = useT();
  // B20: Unsplash photo for the hotel / activity / hotel-like cards.
  // Returns null for flight/train/bus/eSIM (they already have strong
  // gradient identity, photos would compete with the boarding-pass feel).
  const imageQuery =
    booking?.type === "hotel"
      ? `${booking.title} ${booking.hotel?.address?.split(",")[1] ?? ""}`.trim()
      : booking?.type === "activity"
        ? `${booking.activity?.venue ?? booking.title}`
        : null;
  const photo = useWalletImage(imageQuery);
  const { gripProps, sheetStyle } = useDismissDrag(onClose);
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150">
      <div style={sheetStyle} className="bg-background w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto relative animate-in slide-in-from-bottom duration-200">
        {/* Header (the track: grip + header row drag to dismiss) */}
        <div {...gripProps} className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pb-3">
        <SheetGrip className="sm:hidden pt-2 pb-1" />
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="font-bold text-sm">{t(`wallet.detailHeader.${booking.type}`)}</p>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        </div>

        {/* Ticket body */}
        <div className="p-4 space-y-4">
          {/* Hero block — varies by type */}
          {booking.type === "flight" && booking.flight && (
            <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-4xl font-extrabold tabular-nums">{booking.flight.fromCode}</p>
                  <p className="text-[12px] opacity-80">{booking.flight.fromCity}</p>
                </div>
                <Plane className="w-7 h-7 opacity-90 rtl:rotate-180" />
                <div className="text-end">
                  <p className="text-4xl font-extrabold tabular-nums">{booking.flight.toCode}</p>
                  <p className="text-[12px] opacity-80">{booking.flight.toCity}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm font-medium opacity-90 mb-3">
                <p className="tabular-nums">{booking.flight.depTime}</p>
                <p className="text-xs bg-white/15 rounded-full px-2 py-0.5 tabular-nums">
                  {booking.flight.durationLabel}
                </p>
                <p className="tabular-nums">{booking.flight.arrTime}</p>
              </div>
            </div>
          )}

          {(booking.type === "bus" || booking.type === "train") && (
            <RouteHero booking={booking} />
          )}

          {booking.type === "hotel" && booking.hotel && (
            <div className="rounded-3xl overflow-hidden relative text-white shadow-lg shadow-blue-500/20">
              {/* B20: real hotel photo from Unsplash behind the gradient.
                  Falls back to the original gradient when the API hasn't
                  responded yet (or fails) so the card never looks broken. */}
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={booking.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-700/70 via-cyan-700/55 to-teal-800/70" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-600" />
              )}
              <div className="relative p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Hotel className="w-7 h-7" />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-lg leading-tight truncate">{booking.title}</p>
                    <p className="text-[12px] opacity-90 truncate">{booking.hotel.address}</p>
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2">
                  <p className="text-[10px] opacity-80 uppercase tracking-wider">{t("wallet.checkIn")}</p>
                  <p className="font-bold text-sm tabular-nums">{booking.hotel.checkIn}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2">
                  <p className="text-[10px] opacity-80 uppercase tracking-wider">{t("wallet.checkOut")}</p>
                  <p className="font-bold text-sm tabular-nums">{booking.hotel.checkOut}</p>
                </div>
              </div>
              {photo && (
                <a
                  href={photo.creditLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] opacity-50 hover:opacity-90 mt-2 inline-block"
                >
                  📸 {photo.creditName}
                </a>
              )}
              </div>
            </div>
          )}

          {booking.type === "esim" && booking.esim && (
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 shadow-lg shadow-emerald-500/20">
              <div className="flex items-center gap-3 mb-3">
                <Wifi className="w-7 h-7" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-lg truncate">{booking.esim.country}</p>
                  <p className="text-[12px] opacity-90">{booking.partner}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mb-3">
                <div className="bg-white/10 rounded-2xl p-2">
                  <p className="text-[10px] opacity-80 uppercase tracking-wider">{t("wallet.data")}</p>
                  <p className="font-bold text-lg">{booking.esim.dataAllowance}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-2">
                  <p className="text-[10px] opacity-80 uppercase tracking-wider">{t("wallet.validity")}</p>
                  <p className="font-bold text-lg">{booking.esim.validity}</p>
                </div>
              </div>
              <p className="text-[10px] opacity-80 uppercase tracking-wider mb-1">
                {t("wallet.activationCode")}
              </p>
              <p className="text-[10px] font-mono bg-black/20 rounded-lg p-2 break-all">
                {booking.esim.activationCode}
              </p>
            </div>
          )}

          {booking.type === "activity" && booking.activity && (
            <div className="rounded-3xl overflow-hidden relative text-white shadow-lg shadow-amber-500/20">
              {/* B20: venue photo behind the gradient — same pattern as
                  the hotel card. */}
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={booking.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-700/70 to-orange-800/70" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600" />
              )}
              <div className="relative p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Ticket className="w-7 h-7" />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-lg leading-tight truncate">{booking.title}</p>
                    <p className="text-[12px] opacity-90 truncate">{booking.activity.venue}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <p className="font-medium">{booking.activity.startTime}</p>
                </div>
                {photo && (
                  <a
                    href={photo.creditLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] opacity-50 hover:opacity-90 mt-2 inline-block"
                  >
                    📸 {photo.creditName}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Passenger / room / etc. — type-specific fields */}
          <DetailFields booking={booking} />

          {/* Notched barcode card — the classic ticket look */}
          <div className="relative bg-card border border-border rounded-3xl p-5">
            {/* notches */}
            <div className="absolute start-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background rtl:translate-x-1/2 rtl:-end-0 rtl:start-auto" />
            <div className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-background rtl:-translate-x-1/2 rtl:start-0 rtl:end-auto" />

            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-center mb-2">
              {booking.type === "esim" ? t("wallet.scanQr") : t("wallet.boardingCode")}
            </p>
            <div className="flex justify-center mb-2">
              {booking.type === "esim" ? (
                <FakeBarcode seed={booking.reference} kind="qr" />
              ) : (
                <FakeBarcode seed={booking.reference} />
              )}
            </div>
            <p className="text-center text-[12px] font-mono tabular-nums tracking-widest text-muted-foreground">
              {booking.reference}
            </p>
          </div>

          {/* Price + source row */}
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {t("wallet.totalPaid")}
              </p>
              <p className="text-xl font-extrabold tabular-nums">
                {booking.currency} {booking.price.toLocaleString()}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                {t("wallet.purchasedAt")}
              </p>
              <p className="text-xs font-bold">{booking.partner}</p>
            </div>
          </div>

          {/* Download CTA */}
          <button
            type="button"
            className="w-full rounded-full bg-foreground text-background font-bold py-3.5 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            {booking.type === "esim"
              ? t("wallet.downloadEsim")
              : booking.type === "hotel"
                ? t("wallet.downloadVoucher")
                : t("wallet.downloadTicket")}
          </button>
        </div>
      </div>
    </div>
  );
}

// B22: same disambiguation logic as wallet-card stationCode — kept
// inline to avoid a shared helper. If we grow more places that need it,
// hoist into src/lib/wallet/.
const STOP_WORDS = new Set(["BUT", "AND", "FOR", "THE", "ARE", "WAS", "HAS", "OUT", "OFF", "OWN", "TWO", "OUR", "ONE"]);
function safeStationCode(stationName: string): string {
  const paren = stationName.match(/\(([^)]+)\)/);
  if (paren) {
    const c = paren[1].trim().slice(0, 3).toUpperCase();
    if (!STOP_WORDS.has(c)) return c;
  }
  const words = stationName.replace(/[()]/g, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 3);
    if (initials.length >= 2 && !STOP_WORDS.has(initials)) return initials;
  }
  for (const w of words) {
    const c = w.slice(0, 3).toUpperCase();
    if (c.length === 3 && !STOP_WORDS.has(c) && /^[A-Z]+$/.test(c)) return c;
  }
  return stationName.slice(0, 3).toUpperCase();
}

function RouteHero({ booking }: { booking: MockBooking }) {
  const t = useT();
  const isBus = booking.type === "bus";
  const r = isBus ? booking.bus! : booking.train!;
  const fromCode = isBus ? (r as NonNullable<MockBooking["bus"]>).fromCode : safeStationCode(booking.train!.fromStation);
  const toCode = isBus ? (r as NonNullable<MockBooking["bus"]>).toCode : safeStationCode(booking.train!.toStation);
  const fromCity = isBus ? (r as NonNullable<MockBooking["bus"]>).fromCity : booking.train!.fromStation;
  const toCity = isBus ? (r as NonNullable<MockBooking["bus"]>).toCity : booking.train!.toStation;
  const Icon = isBus ? Bus : Train;
  const grad = isBus
    ? "from-rose-500 via-pink-600 to-fuchsia-700 shadow-rose-500/20"
    : "from-emerald-500 via-teal-600 to-cyan-700 shadow-emerald-500/20";

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${grad} text-white p-5 shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-3xl font-extrabold tabular-nums">{fromCode}</p>
          <p className="text-[12px] opacity-80 truncate">{fromCity}</p>
        </div>
        <Icon className="w-6 h-6 opacity-90" />
        <div className="text-end">
          <p className="text-3xl font-extrabold tabular-nums">{toCode}</p>
          <p className="text-[12px] opacity-80 truncate">{toCity}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm font-medium opacity-90 mb-1">
        <p className="tabular-nums">{r.depTime}</p>
        <p className="text-xs bg-white/15 rounded-full px-2 py-0.5 tabular-nums">{r.durationLabel}</p>
        <p className="tabular-nums">{r.arrTime}</p>
      </div>
      <p className="text-[12px] opacity-80 text-center mt-2">
        {r.operator} {(("trainNumber" in r) ? `· ${r.trainNumber}` : "")}
      </p>
      {void t}
    </div>
  );
}

function DetailFields({ booking }: { booking: MockBooking }) {
  const t = useT();
  if (booking.type === "flight" && booking.flight) {
    const f = booking.flight;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wallet.passenger")} value={f.passenger} />
        <Field label={t("wallet.flightNo")} value={f.flightNumber} />
        <Field label={t("wallet.cabin")} value={f.cabin ?? "—"} />
        <Field label={t("wallet.seat")} value={f.seat ?? "—"} />
      </div>
    );
  }
  if (booking.type === "hotel" && booking.hotel) {
    const h = booking.hotel;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wallet.room")} value={h.roomType} />
        <Field label={t("wallet.guests")} value={`${h.guests}`} />
        <Field label={t("wallet.nights")} value={`${h.nights}`} />
        <Field label={t("wallet.confirmation")} value={booking.reference} />
      </div>
    );
  }
  if (booking.type === "train" && booking.train) {
    const tr = booking.train;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wallet.passenger")} value={tr.passenger} />
        <Field label={t("wallet.trainNo")} value={tr.trainNumber} />
        <Field label={t("wallet.car")} value={tr.car} />
        <Field label={t("wallet.seat")} value={tr.seat} />
      </div>
    );
  }
  if (booking.type === "bus" && booking.bus) {
    const b = booking.bus;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wallet.operator")} value={b.operator} />
        <Field label={t("wallet.seat")} value={b.seat ?? "—"} />
      </div>
    );
  }
  if (booking.type === "activity" && booking.activity) {
    const a = booking.activity;
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("wallet.duration")} value={a.duration} />
        <Field label={t("wallet.guests")} value={`${a.guests}`} />
      </div>
    );
  }
  return null;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 px-3 py-2.5">
      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="font-bold text-sm truncate">{value}</p>
    </div>
  );
}
