"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { getTripWithMembership } from "./trips";
import { geocode } from "@/lib/geocode";
import { buildSeedFeed } from "@/lib/discovery/seed";
import { isOverCap } from "@/lib/places/meter";
import { quality } from "@/lib/discovery/score";
import { getLocale } from "@/lib/i18n";
import { createDecision } from "./decisions";
import { recordEvent } from "@/lib/inbox";
import { notifyDecisionOpened } from "@/lib/notifications";
import type { Place } from "@/lib/places/types";

/**
 * Paxawa v2 — "✨ Plan this day" (planning §3.5, roadmap P5).
 *
 * AI as curator, never author: we assemble a real-place *sequence* for a day
 * (breakfast → morning sight → lunch → afternoon activity → dinner) out of the
 * already-cached seed feeds, ranked by quality (rating × log-reviews) and
 * de-duped against everything already on the trip. Every item is a real Google
 * place with its own pin, photo, and rating — nothing invented. The user
 * previews the sequence, drops what they don't want, and adds it in one tap.
 *
 * Cost: the per-category feeds come from `buildSeedFeed`, which is cached per
 * destination for 6h, so a "Plan this day" tap is usually zero Google calls.
 */

export interface PlannedSlotPlace {
  placeId: string;
  name: string;
  category: string;
  placeTypes: string[];
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  coords: [number, number];
  address: string | null;
  photoRef: string | null;
  hoursSummary: string | null;
  topTip: string | null;
}

export type DaySlot = "breakfast" | "morning" | "lunch" | "afternoon" | "dinner";

export interface PlannedSlot {
  slot: DaySlot;
  time: string;
  place: PlannedSlotPlace;
}

/** The shape of a curated day: which seed bucket fills each slot, and when. */
const TEMPLATE: Array<{ slot: DaySlot; category: string; time: string }> = [
  { slot: "breakfast", category: "coffee", time: "09:00" },
  { slot: "morning", category: "sight", time: "10:30" },
  { slot: "lunch", category: "eat", time: "13:00" },
  { slot: "afternoon", category: "activity", time: "15:30" },
  { slot: "dinner", category: "eat", time: "19:30" },
];

const NEEDED_CATEGORIES = ["coffee", "sight", "eat", "activity"] as const;

function toPayload(p: Place): PlannedSlotPlace {
  return {
    placeId: p.placeId,
    name: p.name,
    category: p.category,
    placeTypes: p.placeTypes,
    rating: p.rating,
    userRatingsTotal: p.userRatingsTotal,
    priceLevel: p.priceLevel,
    coords: p.coords,
    address: p.address,
    photoRef: p.photoRef,
    hoursSummary: p.hoursSummary,
    topTip: p.topTip,
  };
}

export async function planDay(input: {
  tripId: string;
  dayDate: string;
}): Promise<{ slots: PlannedSlot[] }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const geo = await geocode(trip.destination).catch(() => null);
  const center: [number, number] | null = geo ? [geo.lng, geo.lat] : null;
  const locale = (await getLocale()) as "en" | "ar";

  // Never re-suggest a place already anywhere on the trip.
  const existing = await db.query.itineraryItems.findMany({
    where: eq(itineraryItems.tripId, input.tripId),
    columns: { googlePlaceId: true },
  });
  const used = new Set<string>(
    existing.map((e) => e.googlePlaceId).filter((id): id is string => !!id),
  );

  // Pull the cached per-category feeds and rank each by quality. Honor the
  // global spend kill-switch: over cap → serve only already-cached seeds so a
  // Plan-this-day tap on a cold destination can't run fresh Google searches
  // past the cap (the kill-switch must be absolute, not feed-route-only).
  const capped = await isOverCap();
  const feeds = await Promise.all(
    NEEDED_CATEGORIES.map((c) =>
      buildSeedFeed({
        destination: trip.destination,
        center,
        category: c,
        languageCode: locale,
        cacheOnly: capped,
      }).catch(() => [] as Place[]),
    ),
  );
  const byCat: Record<string, Place[]> = {};
  NEEDED_CATEGORIES.forEach((c, i) => {
    byCat[c] = [...feeds[i]].sort((a, b) => quality(b) - quality(a));
  });

  const cursor: Record<string, number> = { coffee: 0, sight: 0, eat: 0, activity: 0 };
  const slots: PlannedSlot[] = [];
  for (const t of TEMPLATE) {
    const list = byCat[t.category] ?? [];
    let pick: Place | null = null;
    while (cursor[t.category] < list.length) {
      const cand = list[cursor[t.category]++];
      if (used.has(cand.placeId)) continue;
      pick = cand;
      used.add(cand.placeId);
      break;
    }
    if (pick) slots.push({ slot: t.slot, time: t.time, place: toPayload(pick) });
  }

  return { slots };
}

/**
 * P5 — send a planned day to the crew as decision cards (the "Plan this day →
 * decision cards" path). Each place becomes a votable card in chat, all
 * proposed for the chosen day, reusing the P4 decisions engine. Per-card
 * notifications are suppressed; one summary lands in the crew's inbox/push so a
 * 5-place day doesn't fire five separate alerts.
 */
export async function sendPlannedDayToCrew(input: {
  tripId: string;
  dayDate: string;
  places: PlannedSlotPlace[];
  mode: "ask" | "suggest";
}): Promise<{ created: number; skipped: number }> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await getTripWithMembership(input.tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");
  if (trip.members.length < 2) throw new Error("Decisions need a crew");

  let created = 0;
  let skipped = 0;
  for (const place of input.places) {
    const res = await createDecision({
      tripId: input.tripId,
      place, // PlannedSlotPlace matches DecisionPlace
      proposedDay: input.dayDate,
      mode: input.mode,
      closesInHours: 24,
      notify: false, // one summary below instead of N
    });
    if (res.ok) created++;
    else skipped++;
  }

  if (created > 0) {
    const proposerName =
      user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler";
    await recordEvent({
      tripId: input.tripId,
      kind: "decision_opened",
      actorUserId: user.id,
      recipients: null,
      title: `${proposerName} planned a day`,
      body: `${created} ${created === 1 ? "place" : "places"} to vote on`,
      payload: { count: created, dayDate: input.dayDate },
    }).catch(() => {});
    notifyDecisionOpened(
      trip.members.map((m) => m.userId),
      user.id,
      proposerName,
      `${created} ${created === 1 ? "place" : "places"}`,
      input.mode,
      input.tripId,
      trip.name,
    ).catch(() => {});
  }

  return { created, skipped };
}
