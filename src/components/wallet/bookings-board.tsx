"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Sparkles,
  Info,
  Eye,
  EyeOff,
  Hotel,
  Plane,
  Wifi,
  Ticket,
  Compass,
  Check,
  CheckCircle2,
} from "lucide-react";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";
import { WalletBoard } from "@/components/wallet/wallet-board";
import { MOCK_BOOKINGS } from "@/components/wallet/mock-bookings";

interface Props {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: number;
  currency: string;
  locale: "en" | "ar";
  userId: string;
  days: string[];
  items: {
    id: string;
    type: string;
    dayDate: string;
    title: string;
    locationName: string | null;
  }[];
}

/**
 * Bookings v3 — a true wallet (product-head brief §A1, the flagship rethink).
 *
 * The page used to do three jobs: a status hero, a "Stays you'd love" hotel
 * carousel (Discover content in a Bookings costume), and the actual tickets.
 * Per the brief we EVICT, not rebalance:
 *   1. Hotel discovery left the building — `StaysRail` is gone; the Stay
 *      category now lives in Discover (the one home for discovery). The
 *      checklist's "Find on Discover →" deep-links there.
 *   2. The page leads with the held passes (WalletBoard) — the boarding-pass /
 *      wallet cards are the first substantial thing below the header. The
 *      moment of delight is the pass cards themselves.
 *   3. "Still to sort" is a quiet completion checklist, not a second store —
 *      each gap has at most ONE primary action (Find on Discover, or Mark
 *      booked). The booking happens elsewhere; Bookings only tracks the gap.
 *   4. The status header is a single honest line (state + booked value), never
 *      a "trip total spent" (that number is Money's, and only Money's).
 */
export function BookingsBoard(props: Props) {
  const t = useT();
  const [hideAmount, setHideAmount] = useState(false);

  // Booked value is reported in the bookings' OWN currency (the passes below are
  // all priced in it) — not the trip's base currency, which would label e.g.
  // SAR amounts as "USD" and contradict the cards. Falls back to trip currency
  // only if there are no bookings.
  const bookingCurrency = MOCK_BOOKINGS[0]?.currency ?? props.currency;
  const totalSpend = MOCK_BOOKINGS.reduce((s, b) => s + b.price, 0);
  const bookedCount = MOCK_BOOKINGS.length;

  const gaps = useMemo(() => buildGaps(props, t), [props, t]);
  // Local "mark booked" — a gap can be cleared without leaving the page. The
  // booking itself happens in Discover; this just tracks the checklist state.
  const [done, setDone] = useState<Set<string>>(new Set());
  const remaining = gaps.filter((g) => !done.has(g.id));
  const todoCount = remaining.length;

  const dateRange = `${format(parseDateOnly(props.startDate), "d MMM")} – ${format(parseDateOnly(props.endDate), "d MMM yyyy")}`;
  const formattedValue = `${bookingCurrency} ${totalSpend.toLocaleString()}`;

  function markBooked(id: string) {
    setDone((prev) => new Set(prev).add(id));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 lg:max-w-none lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start lg:space-y-0">
      <div className="space-y-6 min-w-0">
        {/* Header — the page's single job, stated once. */}
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("bookings.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("bookings.jobLine")}</p>
        </div>

        {/* Trip context breadcrumb. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            <span className="font-bold text-foreground truncate">{props.tripName}</span>
          </span>
          <span>·</span>
          <span className="truncate">{props.destination}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateRange}
          </span>
        </div>

        {/* §A1: the status header is a SINGLE honest line — state + booked value
            — not a hero card. Tappable eye toggle for privacy. It reports
            state; it never competes with Money's trip-spend total. */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3">
          <p className="text-sm font-bold tabular-nums leading-tight">
            {hideAmount
              ? t("bookings.statusLine", { booked: bookedCount, value: "••••", todo: todoCount })
              : t("bookings.statusLine", { booked: bookedCount, value: formattedValue, todo: todoCount })}
          </p>
          <button
            type="button"
            onClick={() => setHideAmount((v) => !v)}
            className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
            aria-label={hideAmount ? t("bookings.showAmount") : t("bookings.hideAmount")}
          >
            {hideAmount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* §A1: the held passes are the page's PRIMARY content — the first
            substantial thing below the header. The wallet/pass cards (barcode,
            route arc, glass) are the moment of delight. */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <p className="text-[11px] font-extrabold tracking-widest uppercase text-muted-foreground">
              {t("bookings.passesTitle")}
            </p>
            <span className="text-[10px] text-muted-foreground">· {t("bookings.passesSub", { count: bookedCount })}</span>
          </div>
          <WalletBoard
            userId={props.userId}
            tripName={props.tripName}
            destination={props.destination}
            startDate={props.startDate}
            endDate={props.endDate}
            embedded
          />
        </section>

        {/* §A1: "Still to sort" — a quiet checklist of gaps, visibly NOT a
            product grid. One primary action per row: route to Discover, or
            mark as booked. */}
        <Checklist
          gaps={remaining}
          tripId={props.tripId}
          allDoneLabel={t("bookings.checklistAllDone")}
          onMarkBooked={markBooked}
        />
      </div>

      {/* Right rail on lg+ — forward-email hint + disclosure. Sticks to the top
          as the list scrolls; flows under on mobile. */}
      <div className="space-y-3 lg:sticky lg:top-6 lg:space-y-4">
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

        <p className="flex items-start gap-1.5 text-[10px] text-muted-foreground px-1 leading-relaxed">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{t("plan.disclosure")}</span>
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

type GapTone = "blue" | "violet" | "emerald" | "amber";

interface Gap {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: GapTone;
  title: string;
  subtitle: string;
  /** When set, the row's primary action deep-links into this Discover
   *  category; otherwise the row only offers "Mark booked". */
  discoverCategory?: string;
}

const TONE: Record<GapTone, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
};

/**
 * The quiet "to book" checklist — a calm list of gaps, NOT a sales surface.
 * Each row: an icon, a one-line title + subtitle, and at most one primary
 * action (route to Discover, or mark booked).
 */
function Checklist({
  gaps,
  tripId,
  allDoneLabel,
  onMarkBooked,
}: {
  gaps: Gap[];
  tripId: string;
  allDoneLabel: string;
  onMarkBooked: (id: string) => void;
}) {
  const t = useT();

  return (
    <section className="space-y-3">
      <div className="px-0.5">
        <p className="text-[11px] font-extrabold tracking-widest uppercase text-muted-foreground">
          {t("bookings.checklistTitle")}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{t("bookings.checklistSub")}</p>
      </div>

      {gaps.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{allDoneLabel}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {gaps.map((g) => {
            const c = TONE[g.tone];
            const Icon = g.icon;
            const discoverHref = g.discoverCategory
              ? `/trips/${tripId}/discover?category=${g.discoverCategory}`
              : `/trips/${tripId}/discover`;
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-snug line-clamp-1">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{g.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={discoverHref}
                    prefetch={false}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-[11px] font-bold px-3 py-2 hover:opacity-90 transition-opacity"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{t("bookings.findOnDiscover")}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onMarkBooked(g.id)}
                    aria-label={t("bookings.markBooked")}
                    title={t("bookings.markBooked")}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Derive the gap list from the trip + itinerary — what the trip needs that
 * isn't booked yet. Hotels route to Discover's Stay category; activities to
 * Discover too. Flight + eSIM are mark-only (no Discover category for them).
 * Mirrors the prior to-book accounting so the status line stays in sync.
 */
function buildGaps(props: Props, t: (k: string, p?: Record<string, string | number>) => string): Gap[] {
  const accommodationItems = props.items.filter((i) => i.type === "accommodation");
  const cities = props.destination
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 5);
  const citiesWithoutHotel = cities.filter((city) => {
    const cityLower = city.toLowerCase();
    return !accommodationItems.some(
      (a) =>
        a.locationName?.toLowerCase().includes(cityLower) ||
        a.title.toLowerCase().includes(cityLower),
    );
  });
  const activityItems = props.items.filter(
    (i) => i.type === "activity" || i.type === "meal",
  );

  const gaps: Gap[] = [];

  for (const city of citiesWithoutHotel) {
    gaps.push({
      id: `hotel-${city}`,
      icon: Hotel,
      tone: "blue",
      title: t("bookings.checklistHotel", { city }),
      subtitle: t("bookings.checklistHotelSub"),
      discoverCategory: "stay",
    });
  }

  gaps.push({
    id: "flight-roundtrip",
    icon: Plane,
    tone: "violet",
    title: t("bookings.checklistFlight"),
    subtitle: t("bookings.checklistFlightSub", { destination: cities[0] ?? props.destination }),
  });

  gaps.push({
    id: "esim",
    icon: Wifi,
    tone: "emerald",
    title: t("bookings.checklistEsim"),
    subtitle: t("bookings.checklistEsimSub", { destination: props.destination }),
  });

  for (const item of activityItems.slice(0, 3)) {
    gaps.push({
      id: `activity-${item.id}`,
      icon: Ticket,
      tone: "amber",
      title: t("bookings.checklistActivity", { title: item.title }),
      subtitle: t("bookings.checklistActivitySub"),
      discoverCategory: "activity",
    });
  }

  return gaps;
}
