"use client";

import { useEffect, useState } from "react";
import {
  Hotel,
  Plane,
  Wifi,
  Ticket,
  ArrowUpRight,
  Sparkles,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useT } from "@/components/i18n/locale-provider";
import { buildBookingLink, buildAiraloLink } from "@/lib/affiliate/build-link";
import { format } from "@/lib/i18n/date-fns";
import { parseISO } from "date-fns";

/**
 * The "احجز / Book" mode of the Plan tab. Lives next to the existing Map
 * view; switched via the swipe segment control at the top of the
 * itinerary canvas.
 *
 * Content is 100% derived from the trip + itinerary — no manual data
 * entry needed:
 *   - Hotels needed = trip days minus any item.type === "accommodation"
 *   - Flights      = trip origin → destination (round-trip)
 *   - eSIM         = trip country, if Airalo supports it
 *   - Activities   = items the user has planned, with affiliate matches
 *
 * Each row is a clear "needs booking" card with an active affiliate CTA
 * that opens the partner site and records click intent in localStorage.
 * When the user returns, an active confirmation banner ("Did you book
 * Mandarin Oriental? [Yes, add it]") sits at the top of this view.
 *
 * After confirmation the item flips to a green "Booked ✓" card and
 * gets pushed to the Wallet tab + itinerary day.
 */
interface ItineraryItemRef {
  id: string;
  type: string;
  dayDate: string;
  title: string;
  locationName: string | null;
}

interface Props {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: number;
  currency: string;
  locale: "en" | "ar";
  days: string[];
  items: ItineraryItemRef[];
}

interface PendingIntent {
  id: string;
  partner: "booking" | "airalo" | "gyg";
  title: string;
  meta: string;
  clickedAt: number;
}

const INTENT_KEY = (tripId: string) => `paxawa.bookingIntents.${tripId}`;
const CONFIRMED_KEY = (tripId: string) => `paxawa.confirmedBookings.${tripId}`;

export function BookMode({
  tripId,
  destination,
  startDate,
  endDate,
  members,
  currency,
  locale,
  days,
  items,
}: Props) {
  const t = useT();
  const [intents, setIntents] = useState<PendingIntent[]>([]);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  // Read pending click intents + confirmed bookings from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTENT_KEY(tripId));
      if (raw) setIntents(JSON.parse(raw));
      const conf = localStorage.getItem(CONFIRMED_KEY(tripId));
      if (conf) setConfirmed(new Set(JSON.parse(conf)));
    } catch {
      // ignore
    }
  }, [tripId]);

  function recordIntent(intent: Omit<PendingIntent, "clickedAt">) {
    const next: PendingIntent = { ...intent, clickedAt: Date.now() };
    const merged = [...intents.filter((i) => i.id !== intent.id), next];
    setIntents(merged);
    localStorage.setItem(INTENT_KEY(tripId), JSON.stringify(merged));
  }

  function confirmBooking(intentId: string) {
    const merged = new Set(confirmed);
    merged.add(intentId);
    setConfirmed(merged);
    localStorage.setItem(CONFIRMED_KEY(tripId), JSON.stringify([...merged]));
    // Drop the intent — it's confirmed now
    const nextIntents = intents.filter((i) => i.id !== intentId);
    setIntents(nextIntents);
    localStorage.setItem(INTENT_KEY(tripId), JSON.stringify(nextIntents));
  }

  function dismissIntent(intentId: string) {
    const nextIntents = intents.filter((i) => i.id !== intentId);
    setIntents(nextIntents);
    localStorage.setItem(INTENT_KEY(tripId), JSON.stringify(nextIntents));
  }

  // ── Derive what's missing from the itinerary ──────────────────────────
  const accommodationItems = items.filter((i) => i.type === "accommodation");
  const accommodationDays = new Set(accommodationItems.map((i) => i.dayDate));
  // Only nights where we'll sleep need a hotel — the last day is checkout, skip it
  const nightsWithoutHotel = days.slice(0, -1).filter((d) => !accommodationDays.has(d));

  const activityItems = items.filter(
    (i) => i.type === "activity" || i.type === "meal",
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-20 space-y-5">
      {/* Pending intents — the "did you book it?" active confirmation banners.
          Show at the top so the user can't miss them. */}
      {intents.length > 0 && (
        <div className="space-y-2">
          {intents.map((intent) => (
            <div
              key={intent.id}
              className="rounded-2xl border border-amber-500/40 bg-amber-500/8 p-3 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest uppercase text-amber-700 dark:text-amber-400 mb-0.5">
                  {t("plan.bookConfirmHeader")}
                </p>
                <p className="font-bold text-sm leading-snug">
                  {t("plan.bookConfirmTitle", { name: intent.title })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {intent.meta}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => confirmBooking(intent.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-[11px] font-bold px-3 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-3 h-3" />
                    {t("plan.confirmAdd")}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissIntent(intent.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground px-2"
                  >
                    {t("plan.confirmNotYet")}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissIntent(intent.id)}
                className="w-6 h-6 rounded-full hover:bg-foreground/10 flex items-center justify-center shrink-0"
                aria-label={t("affiliate.dismiss")}
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HOTELS section */}
      <Section
        title={t("plan.sectionHotels")}
        meta={t("plan.hotelsMeta", { count: nightsWithoutHotel.length })}
        icon={Hotel}
        tone="blue"
      >
        {nightsWithoutHotel.length === 0 ? (
          <EmptyDone label={t("plan.allHotelsBooked")} />
        ) : (
          nightsWithoutHotel.map((d, idx) => {
            const intentId = `hotel-${d}`;
            const isConfirmed = confirmed.has(intentId);
            const label = t("plan.nightN", { n: idx + 1, date: format(parseISO(d), "d MMM") });
            const href = buildBookingLink({
              destination,
              startDate: d,
              endDate: addOneDay(d),
              members,
              surface: "itinerary_day_empty",
              tripId,
              currency,
              locale,
            });
            return (
              <NeedRow
                key={d}
                title={label}
                subtitle={t("plan.hotelSub", { destination, currency, price: 280 })}
                href={href}
                ctaLabel={t("plan.ctaBookHotel")}
                onClick={() =>
                  recordIntent({
                    id: intentId,
                    partner: "booking",
                    title: label,
                    meta: `${destination} · ${format(parseISO(d), "d MMM")}`,
                  })
                }
                booked={isConfirmed}
                icon={Hotel}
                tone="blue"
              />
            );
          })
        )}
      </Section>

      {/* FLIGHTS section */}
      <Section
        title={t("plan.sectionFlights")}
        meta={t("plan.flightsMeta", { count: 2 })}
        icon={Plane}
        tone="violet"
      >
        {(() => {
          const outIntent = "flight-outbound";
          const retIntent = "flight-return";
          const outBooked = confirmed.has(outIntent);
          const retBooked = confirmed.has(retIntent);
          const outHref = buildBookingLink({
            destination,
            startDate,
            endDate,
            members,
            surface: "trip_overview_hero",
            tripId,
            currency,
            locale,
          });
          return (
            <>
              <NeedRow
                title={t("plan.flightOutbound", { destination })}
                subtitle={t("plan.flightSub", { date: format(parseISO(startDate), "d MMM"), currency, price: 1280 })}
                href={outHref}
                ctaLabel={t("plan.ctaCompareFlights")}
                onClick={() =>
                  recordIntent({
                    id: outIntent,
                    partner: "booking",
                    title: t("plan.flightOutbound", { destination }),
                    meta: format(parseISO(startDate), "d MMM yyyy"),
                  })
                }
                booked={outBooked}
                icon={Plane}
                tone="violet"
              />
              <NeedRow
                title={t("plan.flightReturn", { destination })}
                subtitle={t("plan.flightSub", { date: format(parseISO(endDate), "d MMM"), currency, price: 1280 })}
                href={outHref}
                ctaLabel={t("plan.ctaCompareFlights")}
                onClick={() =>
                  recordIntent({
                    id: retIntent,
                    partner: "booking",
                    title: t("plan.flightReturn", { destination }),
                    meta: format(parseISO(endDate), "d MMM yyyy"),
                  })
                }
                booked={retBooked}
                icon={Plane}
                tone="violet"
              />
            </>
          );
        })()}
      </Section>

      {/* eSIM section */}
      <Section
        title={t("plan.sectionConnectivity")}
        meta={t("plan.connectivityMeta")}
        icon={Wifi}
        tone="emerald"
      >
        {(() => {
          const intentId = "esim";
          const isBooked = confirmed.has(intentId);
          const href = buildAiraloLink({
            destination,
            surface: "trip_overview_esim",
            tripId,
          });
          return (
            <NeedRow
              title={t("plan.esimTitle", { destination })}
              subtitle={t("plan.esimSub")}
              href={href}
              ctaLabel={t("plan.ctaGetEsim")}
              onClick={() =>
                recordIntent({
                  id: intentId,
                  partner: "airalo",
                  title: t("plan.esimTitle", { destination }),
                  meta: t("plan.esimSub"),
                })
              }
              booked={isBooked}
              icon={Wifi}
              tone="emerald"
              privateChip
            />
          );
        })()}
      </Section>

      {/* ACTIVITIES section (derived from itinerary items) */}
      {activityItems.length > 0 && (
        <Section
          title={t("plan.sectionActivities")}
          meta={t("plan.activitiesMeta", { count: activityItems.length })}
          icon={Ticket}
          tone="amber"
        >
          {activityItems.slice(0, 3).map((item) => {
            const intentId = `gyg-${item.id}`;
            const isBooked = confirmed.has(intentId);
            const href = `https://www.getyourguide.com/s/?q=${encodeURIComponent(item.locationName ?? item.title)}&partner_id=preview&cmp=paxawa-ai_plan_result-${tripId}`;
            return (
              <NeedRow
                key={item.id}
                title={item.title}
                subtitle={t("plan.activitySub", { venue: item.locationName ?? item.title })}
                href={href}
                ctaLabel={t("plan.ctaBookActivity")}
                onClick={() =>
                  recordIntent({
                    id: intentId,
                    partner: "gyg",
                    title: item.title,
                    meta: item.locationName ?? "",
                  })
                }
                booked={isBooked}
                icon={Ticket}
                tone="amber"
              />
            );
          })}
        </Section>
      )}

      {/* Hint to the Wallet tab — closes the loop on the mental model. */}
      <Link
        href={`/trips/${tripId}/wallet?previewAffiliate=1`}
        className="block rounded-2xl border border-dashed border-border bg-muted/20 p-4 hover:border-primary/40 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("plan.walletLinkTitle")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("plan.walletLinkSub")}
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-primary rtl:rotate-180" />
        </div>
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

const TONES = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", btn: "from-blue-500 to-indigo-600" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", btn: "from-violet-500 to-purple-600" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", btn: "from-emerald-500 to-teal-600" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", btn: "from-amber-500 to-orange-600" },
} as const;

function Section({
  title,
  meta,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  const c = TONES[tone];
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2.5 px-0.5">
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            {meta}
          </p>
          <p className="font-extrabold text-base leading-tight">{title}</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function NeedRow({
  title,
  subtitle,
  href,
  ctaLabel,
  onClick,
  booked,
  icon: Icon,
  tone,
  privateChip,
}: {
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  onClick: () => void;
  booked: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  privateChip?: boolean;
}) {
  const t = useT();
  const c = TONES[tone];

  if (booked) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/8 p-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <Check className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{title}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {t("plan.booked")}
          </p>
        </div>
        <Link
          href="#wallet"
          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
        >
          {t("plan.openInWallet")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-foreground/15 transition-colors">
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        {privateChip && (
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {t("plan.personalNote")}
          </p>
        )}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${c.btn} text-white text-xs font-bold px-3 py-2 hover:opacity-90 transition-opacity shrink-0`}
      >
        {ctaLabel}
        <ArrowUpRight className="w-3 h-3 rtl:rotate-180" />
      </a>
    </div>
  );
}

function EmptyDone({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
        {label}
      </p>
    </div>
  );
}

function addOneDay(d: string): string {
  const date = new Date(d);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}
