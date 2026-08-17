export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import {
  itineraryItems, expenses, packingItems,
  placeLikes, cachedPlaces, activities, expenseSplits, settlements,
  huddleDecisions, documents,
} from "@/lib/db/schema";
import { simplifySettlements } from "@/lib/settle";
import { effectiveTripBudget } from "@/lib/budget";
import { eq, asc, desc, inArray, and, sql } from "drizzle-orm";
import { eachDayOfInterval, format as isoFormat, differenceInCalendarDays } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getRates } from "@/lib/fx";
import { totalInCurrency, totalInCurrencyBy } from "@/lib/money-total";
import { convert as convertOrNull } from "@/lib/fx";
import { ensureTripHeroImage } from "@/lib/actions/ensure-trip-hero";
import { tripPhase } from "@/lib/trip-phase";
import { getToday } from "@/lib/today-server";
import { NowCockpit, type NowItem } from "@/components/trips/now-cockpit";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { PlanningCockpit } from "@/components/trips/cockpit/planning-cockpit";
import { DepartureCockpit } from "@/components/trips/cockpit/departure-cockpit";
import { RecapCockpit } from "@/components/trips/cockpit/recap-cockpit";
import { PocketDay } from "@/components/pwa/pocket-day";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Phase 6 §3: NOW is the time-aware front page of the trip. One route,
 * four renders, all driven by tripPhase() — the single source of truth.
 *
 *   PLANNING   hero + crew pulse + prep checklist + metrics + teaser
 *   DEPARTURE  slim hero + Departure Board + day-1 preview
 *   LIVE       map cockpit + UpNext sheet
 *   RECAP      The Wrap — memories, stats, settle; zero editing UI
 */
export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  // fix/tz: one "today" for this whole render, resolved in the traveller's
  // zone. Threaded into every client component below so the server HTML and
  // the hydrated render cannot disagree about what day it is.
  const todayIso = await getToday();
  const phase = tripPhase({ startDate: trip.startDate, endDate: trip.endDate }, todayIso);

  // Keep the hero photo warm for every phase's hero.
  ensureTripHeroImage({
    tripId: trip.id,
    destination: trip.destination,
    existingUrl: trip.heroImageUrl,
    existingCreditName: trip.heroImageCreditName,
    existingCreditLink: trip.heroImageCreditLink,
  }).catch(() => {});

  const rows = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.sortOrder), asc(itineraryItems.startTime));

  const items: NowItem[] = rows.map((r) => ({
    id: r.id,
    dayDate: r.dayDate,
    title: r.title,
    type: r.type,
    startTime: r.startTime,
    locationName: r.locationName,
    lat: r.locationLat,
    lng: r.locationLng,
    status: r.status,
    stopType: r.stopType,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    photoUrl: r.photoUrl,
  }));

  const tripCurrency = trip.currency ?? "USD";
  const expRows = await db
    .select({ amount: expenses.amount, currency: expenses.currency, expenseDate: expenses.expenseDate, paidBy: expenses.paidBy })
    .from(expenses)
    .where(eq(expenses.tripId, id));
  const rates = expRows.length ? await getRates(tripCurrency).catch(() => null) : null;
  // A missing rate no longer becomes a number. `?? amt` used to count a
  // 50,000 JPY expense as 50,000 USD — 156x the real figure — and the /money
  // screen's `?? 0` counted the same row as zero. Both are now excluded from
  // the total and reported, so the UI can say the total is incomplete instead
  // of stating a wrong one confidently.
  const spentTotal = totalInCurrency(expRows, tripCurrency, rates);
  const spent = spentTotal.total;
  const spentByUserResult = totalInCurrencyBy(
    expRows.map((e) => ({ amount: Number(e.amount) || 0, currency: e.currency, key: e.paidBy })),
    tripCurrency,
    rates,
  );
  const spentByUser = spentByUserResult.byKey;

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => isoFormat(d, "yyyy-MM-dd"));

  const withCoords = items.find((i) => i.lat != null && i.lng != null);
  const center: [number, number] | null = withCoords
    ? [withCoords.lng as number, withCoords.lat as number]
    : null;

  // §10.3: live profile name over the join-time cached copy.
  const crew = trip.members.map((m) => ({
    userId: m.userId,
    displayName: m.user?.displayName || m.displayName,
    avatarUrl: m.user?.avatarUrl ?? null,
  }));

  const packRows = await db
    .select({ packed: packingItems.packed })
    .from(packingItems)
    .where(eq(packingItems.tripId, id));
  const packing = { packed: packRows.filter((p) => p.packed).length, total: packRows.length };

  // Sprint 5: booking anchors are gone from the UI. Documents own the
  // "I have a confirmation" job — fetched once here for readiness, the
  // PLANNING strip, the DEPARTURE board, and the LIVE day view.
  const tripDocs = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      url: documents.url,
      dayDate: documents.dayDate,
    })
    .from(documents)
    .where(eq(documents.tripId, id));

  // Crew-hearted places (Discover teaser / free-day ideas): place_likes joined
  // with the cached place snapshot for name + photo.
  const likeRows = await db
    .select({ placeId: placeLikes.placeId, userId: placeLikes.userId })
    .from(placeLikes)
    .where(eq(placeLikes.tripId, id));
  const likeCounts = new Map<string, number>();
  for (const l of likeRows) likeCounts.set(l.placeId, (likeCounts.get(l.placeId) ?? 0) + 1);
  const topLiked = [...likeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  let teaser: { placeId: string; name: string; photoRef: string | null; rating: number | null; hearts: number }[] = [];
  if (topLiked.length) {
    const snaps = await db
      .select({ placeId: cachedPlaces.placeId, snapshot: cachedPlaces.snapshot })
      .from(cachedPlaces)
      .where(inArray(cachedPlaces.placeId, topLiked.map(([p]) => p)));
    teaser = topLiked
      .map(([placeId, hearts]) => {
        const snap = snaps.find((s) => s.placeId === placeId)?.snapshot as
          | { name?: string; photoRef?: string | null; rating?: number | null }
          | undefined;
        return snap?.name
          ? { placeId, name: snap.name, photoRef: snap.photoRef ?? null, rating: snap.rating ?? null, hearts }
          : null;
      })
      .filter(Boolean)
      .slice(0, 3) as typeof teaser;
  }

  const dict = getDictionary(await getLocale());
  const t = (key: string, params?: Record<string, string | number>) => tFromDict(dict, key, params);

  // Crew Pulse ticker: last activity row (§6.5 — one line, never a feed).
  const lastActivity = await db.query.activities.findFirst({
    where: eq(activities.tripId, id),
    orderBy: [desc(activities.createdAt)],
    with: { actor: true },
  });
  const ticker = lastActivity
    ? {
        text: describeEvent(t, lastActivity.actor?.displayName ?? "—", lastActivity.eventType, lastActivity.placeName),
        eventType: lastActivity.eventType,
      }
    : null;

  // Readiness is deliberately NOT computed here any more. It used to be a
  // weighted score (locked days 40% · budget 10% · packing 20% · crew 10% ·
  // docs 20%) with no relationship to the 5-step checklist rendered directly
  // beneath it — so a brand-new trip read "Trip 0% ready" above "1 done ✓".
  // The bar and the checklist now both derive from lib/trip-readiness.ts,
  // from the same facts in the same call. No component takes a percentage as
  // a prop any more, so the two cannot drift apart again.

  // Phase 7 §5: open decisions drive the ONE primary action card.
  const [{ count: huddleOpen }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(huddleDecisions)
    .where(and(eq(huddleDecisions.tripId, id), eq(huddleDecisions.status, "open")));

  const shared = {
    todayIso,
    tripId: id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    heroImageUrl: trip.heroImageUrl ?? trip.coverImage ?? null,
    currency: tripCurrency,
    // A per-person budget must be multiplied by the crew size before any
    // screen compares spend against it. LIVE already did this (see the
    // NowCockpit call below); PLANNING, DEPARTURE and RECAP read the raw
    // column, so a "$2,000 per person" trip with 4 people showed a $2,000
    // budget on three screens and $8,000 on two others.
    budgetTotal: effectiveTripBudget(trip.budgetTotal, trip.budgetType, crew.length),
    days,
    items,
    crew,
    packing,
    spent,
    ticker,
    teaser,
    documents: tripDocs,
    huddleOpen,
  };


  if (phase === "PLANNING") {
    return <PlanningCockpit {...shared} />;
  }

  if (phase === "DEPARTURE") {
    return (
      <>
        <PocketDay
          tripId={id}
          startDate={trip.startDate}
          endDate={trip.endDate}
          days={days}
          stops={items.map((i) => ({ dayDate: i.dayDate, photoUrl: i.photoUrl ?? null }))}
          todayIso={todayIso}
        />
        <DepartureCockpit {...shared} t={t} />
      </>
    );
  }

  if (phase === "RECAP") {
    // Hearts per user (crew awards).
    const heartsByUser: Record<string, number> = {};
    for (const l of likeRows) heartsByUser[l.userId] = (heartsByUser[l.userId] ?? 0) + 1;

    // Balances: unsettled splits net per member, minus recorded settlements,
    // then simplified into minimal pairs (§8-A).
    const splitRows = await db
      .select({
        debtorId: expenseSplits.userId,
        amountOwed: expenseSplits.amountOwed,
        settled: expenseSplits.settled,
        payerId: expenses.paidBy,
        currency: expenses.currency,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(eq(expenses.tripId, id));
    const nets = new Map<string, number>();
    for (const s of splitRows) {
      if (s.settled || s.debtorId === s.payerId) continue;
      const amt = Number(s.amountOwed) || 0;
      // Same rule as the spend total: a missing rate is NOT a number. An
      // unconvertible split is skipped rather than counted at face value —
      // `?? amt` here rendered an unsettled 25,000 JPY share as
      // "Bob owes you USD 25,000".
      const converted =
        s.currency === tripCurrency
          ? amt
          : convertOrNull(amt, s.currency, tripCurrency, rates);
      if (converted == null) continue;
      nets.set(s.payerId, (nets.get(s.payerId) ?? 0) + converted);
      nets.set(s.debtorId, (nets.get(s.debtorId) ?? 0) - converted);
    }
    const settledRows = await db
      .select()
      .from(settlements)
      .where(eq(settlements.tripId, id));
    for (const st of settledRows) {
      const amt = Number(st.amount) || 0;
      if (st.creditorId) nets.set(st.creditorId, (nets.get(st.creditorId) ?? 0) - amt);
      if (st.debtorId) nets.set(st.debtorId, (nets.get(st.debtorId) ?? 0) + amt);
    }
    const settlePairs = simplifySettlements(
      [...nets.entries()].map(([userId, net]) => ({ userId, net })),
    );

    return (
      <RecapCockpit
        {...shared}
        spentByUser={Object.fromEntries(spentByUser)}
        heartsByUser={heartsByUser}
        settlePairs={settlePairs}
        currentUserId={user.id}
      />
    );
  }

  // LIVE — the map cockpit.
  return (
    <>
    <PocketDay
      tripId={id}
      startDate={trip.startDate}
      endDate={trip.endDate}
      days={days}
      stops={items.map((i) => ({ dayDate: i.dayDate, photoUrl: i.photoUrl ?? null }))}
      todayIso={todayIso}
    />
    <NowCockpit
      tripId={id}
      tripName={trip.name}
      center={center}
      days={days}
      items={items}
      budget={{
        // QA BUG-11: per-person budgets multiply by crew size.
        total: effectiveTripBudget(trip.budgetTotal, trip.budgetType, crew.length),
        spent,
        currency: tripCurrency,
      }}
      crew={crew}
      endDate={trip.endDate}
      teaser={teaser}
      documents={tripDocs.filter((d) => d.dayDate != null)}
      todayIso={todayIso}
    />
    </>
  );
}

type TickerT = (key: string, params?: Record<string, string | number>) => string;
function describeEvent(t: TickerT, actor: string, eventType: string, placeName: string | null): string {
  switch (eventType) {
    case "place_hearted": return t("cockpit.tickerHearted", { actor, place: placeName ?? t("cockpit.tickerAPlace") });
    case "stop_added": return t("cockpit.tickerAdded", { actor, place: placeName ?? t("cockpit.tickerAStop") });
    case "stop_locked": return t("cockpit.tickerLocked", { actor, place: placeName ?? t("cockpit.tickerAStop") });
    case "expense_logged": return t("cockpit.tickerExpense", { actor });
    case "pack_item_claimed": return t("cockpit.tickerPack", { actor });
    case "poll_closed": return t("cockpit.tickerPoll", { actor });
    default: return t("cockpit.tickerMove", { actor });
  }
}
