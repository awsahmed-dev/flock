"use client";

import Link from "next/link";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { diffDaysIso, toIsoDay } from "@/lib/today";
import { tripMoment, NEAR_DAYS, PACK_DAYS } from "@/lib/trip-moment";
import { Ticket, QuietAction, type TicketHue } from "./ticket";
import { Horizon, runwayPos, type HorizonMarkState } from "./horizon";
import { FileText, Package } from "@phosphor-icons/react/dist/ssr";
import { Star, CaretRight as ChevronRight, CheckSquareOffset as Vote, MapPin, Users, Wallet, Compass } from "@phosphor-icons/react/dist/ssr";
import { CrewPulse } from "./crew-pulse";
import { docKindIcon } from "@/lib/document-kind";
import { MetricGrid } from "./metric-grid";
import { DayPillRail } from "./day-pill-rail";
import { useT } from "@/components/i18n/locale-provider";
import type { CockpitShared } from "./types";

/**
 * Phase 7 §5 — NOW in PLANNING phase, hierarchy reset. Above the fold:
 * hero (220px) + ONE primary action (64px) + the readiness bar. Everything
 * else — day pills, crew, teaser, metrics — lives below the fold, metrics
 * LAST (they're reference, not actions).
 *
 * First-run pass: the screen now actually obeys the "ONE primary action"
 * rule above. It used to offer ELEVEN controls that all resolved to
 * /itinerary (the primary CTA, a "Plan days" row, N day chips, the PLANNED
 * metric cell, and the nav's left circle) out of 23 total — measured at
 * 390x844 on a brand-new trip. Removed here: the "Plan days" row and the
 * PLANNED cell, both pure duplicates of the CTA; and the day rail while the
 * trip has zero stops, where it is N identical links to nothing.
 *
 * Added: an explicit "Invite your crew" second action. Paxawa is a group
 * app, but on a fresh solo trip CrewPulse returns null (crew < 2) and the
 * only route to invites was a metric cell or a collapsed checklist row — so
 * the one thing that makes this app different was invisible at exactly the
 * moment it mattered most. It is suppressed when the primary action is
 * already the invite, so the two can never say the same thing.
 */
export function PlanningCockpit(props: CockpitShared) {
  const t = useT();
  const {
    tripId, name, destination, startDate, endDate, heroImageUrl,
    currency, budgetTotal, days, items, crew, packing,
    ticker, teaser, huddleOpen, documents, todayIso,
  } = props;
  const base = `/trips/${tripId}`;
  // fix/tz: "15 days to go" was computed from `new Date()` inside a client
  // component, so the server (UTC) and the traveller disagreed for hours every
  // night and the number visibly ticked down on hydration.
  const daysUntil = Math.max(0, diffDaysIso(todayIso, toIsoDay(startDate)));
  const dateLabel = `${dfFormat(parseDateOnly(startDate), "d MMM")} – ${dfFormat(parseDateOnly(endDate), "d MMM yyyy")}`;

  const stopCountByDay: Record<string, number> = {};
  for (const it of items) stopCountByDay[it.dayDate] = (stopCountByDay[it.dayDate] ?? 0) + 1;

  // §5 → step 2 of the Now redesign: THE one primary action now asks "what is
  // DUE?", not just "what is missing?". The ladder used to fall through to
  // packing on a well-planned trip 49 days out (audit Finding 3). Now:
  //   always     decisions → first stops → crew
  //   ≤ 14 days  + budget
  //   packing    never here — the DEPARTURE cockpit owns it (≤ 7 days)
  //   otherwise  a FLOOR: say nothing is due and point at Discover, instead
  //              of inventing a task.
  const moment = tripMoment({ startDate, endDate }, todayIso);
  // Step 3: the action is a TICKET — boarding stub, hue = what it is.
  const primary = (() => {
    if (huddleOpen > 0)
      return {
        key: "votes", hue: "horizon" as TicketHue, icon: Vote,
        kicker: t("cockpit.tk.decideKicker"),
        label: t("cockpit.tk.decideTitle", { count: huddleOpen }),
        sub: t("cockpit.tk.decideSub"),
        href: `${base}/huddle`,
      };
    if (items.length === 0)
      return { key: "stops", hue: "brand" as TicketHue, icon: MapPin, kicker: t("cockpit.tk.firstStopKicker"), label: t("cockpit.firstStops"), sub: t("cockpit.tk.firstStopSub"), href: `${base}/itinerary` };
    if (crew.length < 2)
      return { key: "crew", hue: "brand" as TicketHue, icon: Users, kicker: t("cockpit.tk.crewKicker"), label: t("cockpit.inviteCrew"), sub: t("cockpit.tk.crewSub"), href: `${base}/members` };
    if (moment.due.budget && (budgetTotal == null || budgetTotal <= 0))
      return { key: "budget", hue: "dune" as TicketHue, icon: Wallet, kicker: t("cockpit.tk.dueNow"), label: t("cockpit.setBudget"), sub: t("cockpit.tk.budgetSub", { count: crew.length }), href: `${base}/settings` };
    return { key: "floor", hue: "brand" as TicketHue, icon: Compass, kicker: "", label: t("cockpit.nothingDue", { count: Math.max(0, moment.daysToStart) }), sub: null, href: `${base}/discover` };
  })();

  // The Horizon: days-to-departure as space; the due-items as marks.
  const hasBudget = budgetTotal != null && budgetTotal > 0;
  const hasDocs = documents.length > 0;
  const packedHalf = packing.total > 0 && packing.packed / packing.total >= 0.5;
  const markState = (satisfied: boolean, due: boolean): HorizonMarkState => (satisfied ? "done" : due ? "due" : "later");
  const horizonMarks = [
    { at: runwayPos(NEAR_DAYS), label: t("cockpit.hz.budget"), icon: Wallet, state: markState(hasBudget, moment.due.budget), href: `${base}/settings` },
    { at: runwayPos(7), label: t("cockpit.hz.docs"), icon: FileText, state: markState(hasDocs, moment.due.docs), href: `${base}/huddle?tab=docs` },
    { at: runwayPos(PACK_DAYS), label: t("cockpit.hz.pack"), icon: Package, state: markState(packedHalf, moment.due.packing), href: `${base}/pack` },
  ];
  // The second real first move in a group app. Never shown when the primary
  // action already IS the invite — one job, one control.
  const showInvite = crew.length < 2 && primary.key !== "crew";

  return (
    <main className="bg-background text-foreground min-h-svh">
      {/* 1. HERO — 220px, name + dates + countdown. */}
      <div className="relative w-full overflow-hidden" style={{ height: 220 }}>
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt={destination} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/60" />
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
          {daysUntil <= 0 ? t("cockpit.badgeToday") : t("cockpit.badgeInDays", { count: daysUntil })}
        </div>
      </div>

      <div
        className="flex flex-col gap-4 px-4 pt-4 max-w-2xl mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
      >
        {/* 2. THE ONE PRIMARY ACTION — a boarding stub in the hue of what it
            asks for. When nothing is due (the floor) it is a quiet card with
            the Discover nudge — an invented task would be louder and wrong. */}
        {primary.key === "floor" ? (
          <QuietAction icon={primary.icon} title={primary.label} nudge={t("cockpit.nothingDueNudge")} href={primary.href} />
        ) : (
          <Ticket hue={primary.hue} kicker={primary.kicker} title={primary.label} sub={primary.sub} icon={primary.icon} href={primary.href} go={t("cockpit.tk.go")} />
        )}

        {/* 2b. THE SECOND MOVE — get your people in. Outlined, not filled:
            clearly secondary to the one primary action above it. */}
        {showInvite && (
          <Link
            href={`${base}/members`}
            className="flex items-center gap-3 h-[52px] px-4 rounded-2xl border-[1.5px] border-primary text-foreground active:scale-[0.99] transition-transform"
          >
            <Users size={20} className="shrink-0 text-primary" />
            <span className="flex-1 min-w-0 text-[15px] font-bold truncate">{t("cockpit.inviteCrew")}</span>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground rtl:rotate-180" />
          </Link>
        )}

        {/* 3. THE HORIZON — replaces the "N% ready" bar (step 3). Readiness is
            whatever is still ahead of the dot; each mark opens its thing. */}
        <Horizon
          title={t("cockpit.hz.title", { count: Math.max(0, moment.daysToStart), destination: destination.split(",")[0] })}
          nowLabel={t("cockpit.hz.now", { count: Math.max(0, moment.daysToStart) })}
          progress={runwayPos(moment.daysToStart)}
          marks={horizonMarks}
        />

        {/* ── Below the fold ─────────────────────────────────────────── */}

        {/* 4. DAY PILLS RAIL — only once there is something to see. On an
            empty trip these were N identical links to the same empty page,
            and the "Plan days" row above them was a third copy of the CTA. */}
        {items.length > 0 && (
          <DayPillRail tripId={tripId} days={days} stopCountByDay={stopCountByDay} todayIso={todayIso} />
        )}

        {/* 5. THE CREW. */}
        {/* Sprint 9 FIX-4: readiness no longer passed — the checklist bar
            above is the single "N% ready" on this screen. */}
        <CrewPulse tripId={tripId} crew={crew} ticker={ticker} />

        {/* Sprint 5 §3b: confirmations at a glance — more time-sensitive than
            packing. Quiet prompt when empty; up to 3 chips + See all after. */}
        {documents.length === 0 ? (
          // Now-redesign step 1: opens the Add-a-confirmation sheet (owned by
          // the bottom nav) instead of bouncing to the docs tab.
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("paxawa:openConfirmation"))}
            className="text-[13px] text-muted-foreground px-1 -mt-1 text-start"
          >
            {t("cockpit.addConfirmation")}
          </button>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[15px] font-bold text-foreground">{t("cockpit.documents")}</p>
              <Link href={`${base}/huddle?tab=docs`} className="text-[13px] font-bold text-primary">
                {t("cockpit.seeAll")}
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
            <p className="text-[15px] font-bold text-foreground mb-2">{t("cockpit.crewShortlist")}</p>
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
                <span className="text-[12px] font-semibold text-center px-2">{t("cockpit.openDiscover")}</span>
              </Link>
            </div>
          </section>
        )}

        {/* 7. METRICS — LAST: reference data, not primary actions. */}
        <MetricGrid
          tripId={tripId}
          showPlanned={false}
          placesCount={items.length}
          budgetTotal={budgetTotal}
          currency={currency}
          crewCount={crew.length}
          packing={packing}
          packingDue={moment.due.packing}
        />
      </div>
    </main>
  );
}
