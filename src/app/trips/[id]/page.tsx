export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripOverview } from "@/components/trips/trip-overview";
import { ensureTripHeroImage } from "@/lib/actions/ensure-trip-hero";
import { getBaseUrl } from "@/lib/base-url";
import { db } from "@/lib/db";
import {
  itineraryItems,
  decisions,
  expenses,
  expenseSplits,
  packingItems,
  documents,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { ActionHubStats } from "@/components/trips/pick-suggestion";
import { getRates, convert } from "@/lib/fx";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const invite = trip.invites[0];
  const inviteUrl = invite ? `${getBaseUrl()}/invite/${invite.token}` : null;

  // B19: ensure a hero image (Unsplash) — populated once per trip, then
  // cached forever on the trips row. Fire-and-pass through so the
  // first render after creation still shows a real image.
  const hero = await ensureTripHeroImage({
    tripId: trip.id,
    destination: trip.destination,
    existingUrl: trip.heroImageUrl,
    existingCreditName: trip.heroImageCreditName,
    existingCreditLink: trip.heroImageCreditLink,
  });

  // ── Action-hub stats: run in parallel so the dashboard composes from a
  // single fast batch. None of these are heavy — all single-table scans on
  // an indexed trip_id.
  const [itineraryRows, decisionRows, expenseRows, splitRows, packingRows, docRows] =
    await Promise.all([
      db.query.itineraryItems.findMany({
        where: eq(itineraryItems.tripId, id),
        columns: { dayDate: true },
      }),
      // v2: the Overview "Decide" card reflects chat decisions now, not the
      // retired Votes feature.
      db.query.decisions.findMany({
        where: eq(decisions.tripId, id),
        columns: { status: true },
      }),
      db.query.expenses.findMany({
        where: eq(expenses.tripId, id),
        // B12-followup: include `currency` so the dashboard can FX-
        // convert mixed-currency expenses into the trip base.
        // Previously the sum was raw — a JPY 500 + SAR 100 trip would
        // show "USD 880" on the Money card while the expenses page
        // (which does convert) showed the actual ~USD 130. Same fix
        // applies to myUnsettled below.
        columns: { amount: true, scope: true, currency: true },
      }),
      db.query.expenseSplits.findMany({
        where: and(eq(expenseSplits.userId, user.id), eq(expenseSplits.settled, false)),
        columns: { amountOwed: true, expenseId: true },
        with: {
          expense: {
            columns: { tripId: true, paidBy: true, currency: true },
          },
        },
      }),
      db.query.packingItems.findMany({
        where: eq(packingItems.tripId, id),
        columns: { packed: true },
      }),
      db.query.documents.findMany({
        where: eq(documents.tripId, id),
        columns: { id: true },
      }),
    ]);

  const totalDays =
    differenceInCalendarDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate)) + 1;
  const daysWithItems = new Set(itineraryRows.map((r) => r.dayDate)).size;

  // B12-followup: FX-convert every row to the trip's base currency so
  // the Money card matches the expenses page. Rates are stale-while-
  // revalidate cached, so this is essentially free after the first hit
  // per instance.
  const fxRates = await getRates(trip.currency);
  const toBase = (amount: number, ccy: string) => {
    if (ccy === trip.currency) return amount;
    const c = convert(amount, ccy, trip.currency, fxRates);
    // If the FX provider is down (rates null) we'd rather show the raw
    // amount than silently zero the row out — better to overshoot than
    // tell users they spent nothing.
    return c ?? amount;
  };

  const sharedExpenses = expenseRows.filter((e) => e.scope === "shared");
  const totalSpent = sharedExpenses.reduce(
    (sum, e) => sum + toBase(e.amount ?? 0, e.currency),
    0,
  );

  // Filter splits to this trip's expenses + exclude rows where the user is
  // also the payer (their own splits don't count as "owed").
  const myUnsettled = splitRows
    .filter((s) => s.expense?.tripId === id && s.expense?.paidBy !== user.id)
    .reduce(
      (sum, s) =>
        sum + toBase(s.amountOwed ?? 0, s.expense?.currency ?? trip.currency),
      0,
    );

  const stats: ActionHubStats = {
    itineraryCount: itineraryRows.length,
    daysWithItems,
    totalDays: Math.max(1, totalDays),
    votesOpen: decisionRows.filter((v) => v.status === "open").length,
    votesResolved: decisionRows.filter((v) => v.status !== "open").length,
    expensesCount: expenseRows.length,
    currency: trip.currency,
    totalSpent,
    myUnsettled,
    packingPacked: packingRows.filter((p) => p.packed).length,
    packingTotal: packingRows.length,
    documentsCount: docRows.length,
    memberCount: trip.members.length,
  };

  return (
    <TripOverview
      trip={trip}
      inviteUrl={inviteUrl}
      userId={user.id}
      stats={stats}
      hero={hero}
    />
  );
}
