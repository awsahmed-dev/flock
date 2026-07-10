import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { Star, ChevronRight, Vote, MapPin, Users, Wallet, Package } from "lucide-react";
import { ReadinessChecklist } from "./readiness-checklist";
import { CrewPulse } from "./crew-pulse";
import { docKindIcon } from "@/lib/document-kind";
import { MetricGrid } from "./metric-grid";
import { DayPillRail } from "./day-pill-rail";
import type { CockpitShared } from "./types";

/**
 * Phase 7 §5 — NOW in PLANNING phase, hierarchy reset. Above the fold:
 * hero (220px) + ONE primary action (64px) + the readiness bar. Everything
 * else — day pills, crew, teaser, metrics — lives below the fold, metrics
 * LAST (they're reference, not actions).
 */
export function PlanningCockpit(props: CockpitShared) {
  const {
    tripId, name, destination, startDate, endDate, heroImageUrl,
    currency, budgetTotal, days, items, crew, packing,
    readiness, ticker, teaser, huddleOpen, documents,
  } = props;
  const base = `/trips/${tripId}`;
  const daysUntil = Math.max(0, differenceInCalendarDays(parseDateOnly(startDate), new Date()));
  const dateLabel = `${dfFormat(parseDateOnly(startDate), "d MMM")} – ${dfFormat(parseDateOnly(endDate), "d MMM yyyy")}`;

  const stopCountByDay: Record<string, number> = {};
  for (const it of items) stopCountByDay[it.dayDate] = (stopCountByDay[it.dayDate] ?? 0) + 1;

  // §5: THE one primary action — priority vote > stops > crew > budget > packing.
  const packingPercent = packing.total > 0 ? Math.round((packing.packed / packing.total) * 100) : 0;
  const primary = (() => {
    if (huddleOpen > 0)
      return {
        icon: Vote,
        label: `${huddleOpen} ${huddleOpen === 1 ? "place is" : "places are"} waiting for your vote`,
        href: `${base}/huddle`,
      };
    if (items.length === 0)
      return { icon: MapPin, label: "Start adding your first stops", href: `${base}/itinerary` };
    if (crew.length < 2)
      return { icon: Users, label: "Invite your crew", href: `${base}/members` };
    if (budgetTotal == null || budgetTotal <= 0)
      return { icon: Wallet, label: "Set a budget", href: `${base}/settings` };
    if (packingPercent < 50)
      return {
        icon: Package,
        label: packing.total === 0 ? "Start your packing list" : `Keep packing — ${packingPercent}% done`,
        href: `${base}/pack`,
      };
    return { icon: MapPin, label: "Keep shaping the plan", href: `${base}/itinerary` };
  })();
  const PrimaryIcon = primary.icon;

  return (
    <main className="bg-background text-foreground min-h-svh">
      {/* 1. HERO — 220px, name + dates + countdown. */}
      <div className="relative w-full overflow-hidden" style={{ height: 220 }}>
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt={destination} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-violet-900/50" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 20%, rgba(0,0,0,0.88))" }} />
        <div className="absolute bottom-0 inset-x-0 px-4 pb-3">
          <h1 className="text-white" style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
            {name}
          </h1>
          <p className="text-white/85 text-[13px] mt-0.5">
            {destination} · {dateLabel}
          </p>
        </div>
        <div
          className="absolute top-3 start-4 rounded-lg px-2.5 py-1"
          style={{ fontSize: 11, fontWeight: 700, background: "var(--clr-horizon-dim)", color: "var(--clr-horizon)", border: "1px solid var(--clr-horizon)" }}
        >
          {daysUntil <= 0 ? "TODAY" : `IN ${daysUntil} ${daysUntil === 1 ? "DAY" : "DAYS"}`}
        </div>
      </div>

      <div
        className="flex flex-col gap-4 px-4 pt-4 max-w-2xl mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
      >
        {/* 2. THE ONE PRIMARY ACTION — 64px, unmissable. */}
        <Link
          href={primary.href}
          className="flex items-center gap-3 h-16 px-4 rounded-2xl bg-primary text-white active:scale-[0.99] transition-transform"
          style={{ boxShadow: "0 4px 20px var(--clr-brand-dim)" }}
        >
          <PrimaryIcon size={22} className="shrink-0" />
          <span className="flex-1 min-w-0 text-[17px] font-bold truncate">{primary.label}</span>
          <ChevronRight size={20} className="shrink-0 rtl:rotate-180" />
        </Link>

        {/* 3. READINESS BAR — one line; the checklist hides behind the tap. */}
        <ReadinessChecklist
          base={base}
          readiness={readiness}
          hasDates={!!startDate}
          crewCount={crew.length}
          stopsCount={items.length}
          hasBudget={budgetTotal != null && budgetTotal > 0}
          packedCount={packing.packed}
          packTotal={packing.total}
        />

        {/* ── Below the fold ─────────────────────────────────────────── */}

        {/* 4. DAY PILLS RAIL. */}
        <DayPillRail tripId={tripId} days={days} stopCountByDay={stopCountByDay} />

        {/* 5. THE CREW. */}
        <CrewPulse tripId={tripId} crew={crew} readiness={readiness} ticker={ticker} />

        {/* Sprint 5 §3b: confirmations at a glance — more time-sensitive than
            packing. Quiet prompt when empty; up to 3 chips + See all after. */}
        {documents.length === 0 ? (
          <Link
            href={`${base}/huddle?tab=docs`}
            className="text-[13px] text-muted-foreground px-1 -mt-1"
          >
            🎫 Add a confirmation — flight, hotel, visa →
          </Link>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[15px] font-bold text-foreground">Documents</p>
              <Link href={`${base}/huddle?tab=docs`} className="text-[13px] font-bold text-primary">
                See all →
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
              {documents.slice(0, 3).map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 max-w-[220px] inline-flex items-center gap-2 rounded-2xl bg-card border border-border px-3 h-11"
                >
                  <span aria-hidden className="text-base leading-none">{docKindIcon(d.type)}</span>
                  <span className="text-[13px] font-semibold truncate">{d.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* 6. DISCOVER TEASER — the crew's shortlist. */}
        {teaser.length > 0 && (
          <section>
            <p className="text-[15px] font-bold text-foreground mb-2">The crew&rsquo;s shortlist</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {teaser.map((p) => (
                <Link
                  key={p.placeId}
                  href={`${base}/discover`}
                  className="shrink-0 w-40 rounded-2xl overflow-hidden bg-card border border-border"
                >
                  <div className="relative aspect-[4/3] bg-muted">
                    {p.photoRef && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=320`}
                        alt={p.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-1.5 start-1.5 rounded-full bg-black/55 text-white text-[10px] font-bold px-1.5 py-0.5">
                      ♥ {p.hearts}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-[13px] font-bold line-clamp-1">{p.name}</p>
                    {p.rating != null && (
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
                        <Star size={10} className="fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              <Link
                href={`${base}/discover`}
                className="shrink-0 w-28 rounded-2xl bg-muted border border-border flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <ChevronRight size={18} className="rtl:rotate-180" />
                <span className="text-[12px] font-semibold text-center px-2">Open Discover</span>
              </Link>
            </div>
          </section>
        )}

        {/* 7. METRICS — LAST: reference data, not primary actions. */}
        <MetricGrid
          tripId={tripId}
          placesCount={items.length}
          budgetTotal={budgetTotal}
          currency={currency}
          crewCount={crew.length}
          packing={packing}
        />
      </div>
    </main>
  );
}
