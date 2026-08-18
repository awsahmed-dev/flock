"use client";

import { format as dfFormat } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { diffDaysIso, toIsoDay } from "@/lib/today";
import { tripMoment, NEAR_DAYS, PACK_DAYS } from "@/lib/trip-moment";
import { Ticket, QuietAction, type TicketHue } from "./ticket";
import { Horizon, runwayPos, type HorizonMarkState } from "./horizon";
import { buildDeck } from "@/lib/deck";
import { HeroCard, NoteRow, DeckFooter } from "./deck";
import { FileText, Package } from "@phosphor-icons/react/dist/ssr";
import { CheckSquareOffset as Vote, MapPin, Users, Wallet, Compass } from "@phosphor-icons/react/dist/ssr";
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
    currency, budgetTotal, items, crew, packing,
    ticker, teaser, huddleOpen, documents, todayIso,
  } = props;
  const base = `/trips/${tripId}`;
  // fix/tz: "15 days to go" was computed from `new Date()` inside a client
  // component, so the server (UTC) and the traveller disagreed for hours every
  // night and the number visibly ticked down on hydration.
  const daysUntil = Math.max(0, diffDaysIso(todayIso, toIsoDay(startDate)));
  const dateLabel = `${dfFormat(parseDateOnly(startDate), "d MMM")} – ${dfFormat(parseDateOnly(endDate), "d MMM yyyy")}`;


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
      return { key: "stops", hue: "brand" as TicketHue, icon: MapPin, kicker: t("cockpit.tk.firstStopKicker"), label: t("cockpit.tk.firstStopTitle"), sub: t("cockpit.tk.firstStopSub"), href: `${base}/itinerary` };
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

  // The deck (step 4): facts in, ranked cards out.
  const cityName = destination.split(",")[0].trim();
  const planPlaceIds = new Set(items.map((it) => it.googlePlaceId).filter(Boolean));
  const day1Items = items.filter((it) => it.dayDate === startDate).sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const deck = buildDeck({
    moment,
    base,
    destinationCity: cityName,
    startDate,
    heroImageUrl,
    crewCount: crew.length,
    primaryKey: primary.key,
    hearts: teaser.map((p) => ({
      placeId: p.placeId, name: p.name, hearts: p.hearts,
      photoUrl: p.photoRef ? `/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=800` : null,
      onPlan: planPlaceIds.has(p.placeId),
    })),
    day1: { count: day1Items.length, firstTime: day1Items[0]?.startTime?.slice(0, 5) ?? null, firstTitle: day1Items[0]?.title ?? null, photoUrl: day1Items.find((it) => it.photoUrl)?.photoUrl ?? null },
    weather: props.weather,
    fx: props.fx,
    money: { currency, budget: budgetTotal, perPerson: budgetTotal != null && crew.length > 1 ? budgetTotal / crew.length : null, spent: props.spent },
    docsCount: documents.length,
    ticker: ticker ? { text: ticker.text } : null,
  });

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

        {/* 3. THE HORIZON — replaces the "N% ready" bar (step 3). Readiness is
            whatever is still ahead of the dot; each mark opens its thing. */}
        <Horizon
          title={t("cockpit.hz.title", { count: Math.max(0, moment.daysToStart), destination: destination.split(",")[0] })}
          nowLabel={t("cockpit.hz.now", { count: Math.max(0, moment.daysToStart) })}
          progress={runwayPos(moment.daysToStart)}
          marks={horizonMarks}
        />

        {/* ── Below the fold: THE DECK (step 4) — one photo, then notes ────
            Replaces the day-pill rail, the crew card, the confirmations line,
            the Discover teaser and the metric cells. Every card answers
            "what's it like" or "what's next"; the ticket + horizon own chores.
            Capped at hero + 3 — a deck, not a feed. */}
        {deck.hero && <HeroCard card={deck.hero} />}
        {deck.notes.length > 0 && (
          <div className="flex flex-col gap-2">
            {deck.notes.map((c, i) => <NoteRow key={c.kind} card={c} index={i} />)}
          </div>
        )}
        <DeckFooter
          crew={crew}
          text={t("cockpit.deck.footer", {
            crew: crew.length,
            stops: items.length,
            budget: budgetTotal != null && budgetTotal > 0 ? `${currency} ${Math.round(budgetTotal).toLocaleString()}` : "",
          }).replace(/\s·\s$/, "")}
        />
      </div>
    </main>
  );
}
