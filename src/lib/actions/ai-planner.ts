"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems, votes, voteOptions, chatMessages, profiles } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { geocode } from "@/lib/geocode";

/**
 * Planner v2: items arriving from the grounded planner carry a real
 * Google place (id, coords, photo, rating) — those insert directly with
 * full metadata and NO geocoding. The legacy text-only shape still works
 * (manual additions, older flows) and falls back to Nominatim.
 */
export interface PlannedActivity {
  day: number;
  title: string;
  type: "activity" | "accommodation" | "transport" | "meal";
  startTime?: string;
  locationName?: string;
  costEstimate?: number;
  notes?: string;
  /** grounded place payload (planner v2) */
  place?: {
    placeId: string;
    lat: number;
    lng: number;
    photoUrl?: string | null;
    rating?: number | null;
    userRatingsTotal?: number | null;
    priceLevel?: number | null;
    placeTypes?: string[];
    address?: string | null;
    mapsUrl?: string | null;
  };
}

const VALID_TYPES = ["activity", "accommodation", "transport", "meal", "other"] as const;
type ItemType = typeof VALID_TYPES[number];

function sanitizeType(raw: string): ItemType {
  return VALID_TYPES.includes(raw as ItemType) ? (raw as ItemType) : "activity";
}

/** Only keep times that PostgreSQL TIME accepts (HH:MM or HH:MM:SS). */
function sanitizeTime(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
  return null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Add one or many items directly to itinerary ──────────────────────────────

export async function addPlannedItems(tripId: string, items: PlannedActivity[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found");

  // Ensure profile row exists (required by createdBy FK)
  await db.insert(profiles).values({
    id: user.id,
    displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
    email: user.email,
  }).onConflictDoNothing();

  // Grounded items already carry coordinates; only legacy text items go
  // through Nominatim (best-effort, failures leave coords null).
  const geos = await Promise.all(
    items.map((a) => {
      if (a.place) return Promise.resolve(null);
      const query = (a.locationName || a.title || "").trim();
      if (!query) return Promise.resolve(null);
      return geocode(query, trip.destination ?? undefined).catch(() => null);
    }),
  );

  // Fill missing startTimes from the slot template (every-3h from 09:00).
  const itemsByDay = new Map<number, number>();
  const enriched = items.map((a, i) => {
    const cleaned = sanitizeTime(a.startTime);
    if (cleaned) return { orig: i, ...a, startTime: cleaned };
    const positionInDay = itemsByDay.get(a.day) ?? 0;
    itemsByDay.set(a.day, positionInDay + 1);
    const hour = 9 + positionInDay * 3;
    return { orig: i, ...a, startTime: `${String(hour).padStart(2, "0")}:00` };
  });

  // Sort each day chronologically so the list reads morning → evening.
  const sortedItems = [...enriched].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return parseInt((a.startTime ?? "23:59").replace(":", "")) -
      parseInt((b.startTime ?? "23:59").replace(":", ""));
  });

  const perDayCounter = new Map<number, number>();
  const rows = sortedItems.map((a) => {
    const sortOrder = perDayCounter.get(a.day) ?? 0;
    perDayCounter.set(a.day, sortOrder + 1);
    const geo = geos[a.orig];
    return {
      tripId,
      dayDate: addDays(trip.startDate as string, a.day - 1),
      title: a.title,
      type: sanitizeType(a.type),
      startTime: a.startTime,
      locationName: a.locationName ?? a.place?.address ?? null,
      locationLat: a.place?.lat ?? geo?.lat ?? null,
      locationLng: a.place?.lng ?? geo?.lng ?? null,
      costEstimate: a.costEstimate ?? null,
      notes: a.notes ?? null,
      status: "proposed" as const,
      sortOrder,
      createdBy: user.id,
      // grounded metadata → the item lands on the map as a full place card
      googlePlaceId: a.place?.placeId ?? null,
      provider: a.place ? "google" : "manual",
      photoUrl: a.place?.photoUrl ?? null,
      rating: a.place?.rating ?? null,
      priceLevel: a.place?.priceLevel ?? null,
      userRatingsTotal: a.place?.userRatingsTotal ?? null,
      placeTypes: a.place?.placeTypes ?? null,
    };
  });

  await db.insert(itineraryItems).values(rows);

  revalidatePath(`/trips/${tripId}/itinerary`);
  revalidatePath(`/trips/${tripId}`);

  return { count: rows.length };
}

// ─── Turn planned items into a group vote + chat card ────────────────────────

export async function voteOnPlannedItems(
  tripId: string,
  items: PlannedActivity[],
  question?: string
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found");

  const voteQuestion =
    question ||
    (items.length === 1
      ? `Should we add "${items[0].title}" to our itinerary?`
      : `Which of these ${items.length} activities should we do?`);

  const [vote] = await db
    .insert(votes)
    .values({ tripId, question: voteQuestion, createdBy: user.id })
    .returning();

  const optionLabels: string[] =
    items.length === 1
      ? ["Yes, let's do it!", "Skip it"]
      : items.map((i) => i.title);

  await db.insert(voteOptions).values(
    optionLabels.map((label, i) => ({ voteId: vote.id, label, sortOrder: i }))
  );

  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    type: "vote_card",
    body: null,
    metadata: {
      question: voteQuestion,
      options: optionLabels,
      voteId: vote.id,
      source: "ai_planner",
      // Grounded proof rides along so the vote card can show the real
      // place (photo, rating, Google link) instead of bare text.
      places: items
        .filter((i) => i.place)
        .map((i) => ({
          title: i.title,
          placeId: i.place!.placeId,
          mapsUrl: i.place!.mapsUrl ?? null,
          photoUrl: i.place!.photoUrl ?? null,
          rating: i.place!.rating ?? null,
        })),
    },
  });

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);

  return { voteId: vote.id };
}
