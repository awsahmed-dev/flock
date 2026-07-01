"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Mail,
  Copy,
  Check,
  Hotel,
  Plane,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";

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
 * Bookings v4 — honest first-run wallet (product-head structural rebuild).
 *
 * The previous version rendered MOCK_BOOKINGS — fabricated boarding passes
 * (a Saudia flight, Mandarin Oriental, FlixBus…) shown as if they were the
 * signed-in user's REAL bookings. On a real trip that's trust-destroying:
 * the user knows they never booked a Saudia flight, so they stop believing
 * the whole page. There is no persisted bookings store yet, so the DEFAULT
 * real-trip view is now the honest empty / first-run state:
 *
 *   1. ONE warm explainer states the page's job in plain language.
 *   2. The forward-email affordance is PROMOTED to the hero — it's the magic
 *      of the page and the single visually dominant primary action. (Was a
 *      muted side-rail card.)
 *   3. "Still to sort" — the REAL itinerary gaps (stays / transport with no
 *      booking, the same gap the Tools hub computes) — is the clear secondary
 *      path. Its "Find on Discover" affordances are demoted to low-emphasis
 *      TEXT links (a cross-sell, not the page's purpose — six identical black
 *      pills were choice overload).
 *   4. No fabricated passes and no bare money chip in the empty state. A user
 *      can opt into a clearly-labelled SAMPLE preview to see the populated
 *      layout — it is never presented as their real trip data.
 */
export function BookingsBoard(props: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  // A deterministic, per-trip forward address — honest (it's tied to THIS
  // trip), not a fake shared "trip-abc@". Short slug from the trip id.
  const forwardAddress = `trip-${props.tripId.slice(0, 8)}@inbox.paxawa.com`;

  const gaps = useMemo(() => buildGaps(props, t), [props, t]);
  // Local "mark booked" — a gap can be cleared without leaving the page.
  const [done, setDone] = useState<Set<string>>(new Set());
  const remaining = gaps.filter((g) => !done.has(g.id));

  const dateRange = `${format(parseDateOnly(props.startDate), "d MMM")} – ${format(parseDateOnly(props.endDate), "d MMM yyyy")}`;

  function markBooked(id: string) {
    setDone((prev) => new Set(prev).add(id));
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(forwardAddress);
      setCopied(true);
      toast.success(t("common.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("trip.copyFailed"));
    }
  }

  return (
    <div className="px-4 max-w-2xl mx-auto space-y-6 lg:max-w-3xl">
      {/* §6-C: the "Bookings" title duplicated the active MANAGE sub-tab, so the
          redundant page heading is dropped — the sticky tab already labels the
          section. The one-line job statement stays as context. */}
      <p className="text-sm text-muted-foreground pt-1">{t("bookings.jobLine")}</p>

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

      {/* ── HERO: forward-email = the single dominant primary action. This is
          the magic of the page — get confirmations in. Premium glass/card
          language, the loud thing on the screen. */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/[0.04] to-transparent p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold leading-tight">
              {t("bookings.heroTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-snug">
              {t("bookings.heroBody")}
            </p>
          </div>
        </div>

        {/* The forward address as a copyable field — the primary CTA. */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0 rounded-2xl bg-background/70 border border-border/60 px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {t("bookings.heroAddressLabel")}
            </p>
            <p className="text-sm font-mono font-bold truncate" dir="ltr">
              {forwardAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={copyAddress}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold text-sm px-5 py-3 min-h-[44px] hover:opacity-90 transition-opacity shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t("common.copied") : t("bookings.heroCopy")}
          </button>
        </div>
        <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
          {t("bookings.heroHint")}
        </p>
      </section>

      {/* ── SECONDARY: "Still to sort" — the real itinerary gaps. A calm
          checklist, NOT a product grid. Discover is a low-emphasis text link,
          not a loud black pill. */}
      <Checklist
        gaps={remaining}
        tripId={props.tripId}
        allDoneLabel={t("bookings.checklistAllDone")}
        onMarkBooked={markBooked}
      />

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
  /** When set, the row's text link deep-links into this Discover category. */
  discoverCategory?: string;
  /** §5: when set (and no discoverCategory), the row shows an external search
   *  link instead — e.g. flights aren't in Discover, so link to Google Flights. */
  externalUrl?: string;
  externalLabel?: string;
}

const TONE: Record<GapTone, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
};

/**
 * The quiet "still to sort" checklist — a calm list of the real gaps between
 * what the trip needs and what's booked. Each row: an icon, a one-line
 * title + subtitle, and at most one primary action (mark booked — the loop
 * close) plus a LOW-EMPHASIS "Find on Discover" text link (a cross-sell, not
 * a loud black pill).
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
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{g.subtitle}</span>
                    {g.discoverCategory ? (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        {/* Low-emphasis text link — a cross-sell, not a loud
                            black pill. */}
                        <Link
                          href={discoverHref}
                          prefetch={false}
                          className="shrink-0 font-bold text-primary hover:underline"
                        >
                          {t("bookings.findOnDiscover")}
                        </Link>
                      </>
                    ) : g.externalUrl ? (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        {/* §5: flights aren't in Discover — external search link. */}
                        <a
                          href={g.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-bold text-primary hover:underline"
                        >
                          {g.externalLabel ?? t("bookings.searchFlights")}
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
                {/* The one primary per row: mark booked (the loop close). */}
                <button
                  type="button"
                  onClick={() => onMarkBooked(g.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border text-muted-foreground hover:text-emerald-600 hover:border-emerald-500/40 transition-colors text-[11px] font-bold px-3 py-2 min-h-[40px] shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("bookings.markBooked")}</span>
                </button>
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
 * isn't booked yet. Mirrors the gap accounting the Tools hub uses so the two
 * surfaces stay in sync. Hotels + activities deep-link to Discover; flight +
 * eSIM are mark-only (no Discover category for them).
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
    externalUrl: "https://www.google.com/flights",
    externalLabel: t("bookings.searchFlights"),
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
