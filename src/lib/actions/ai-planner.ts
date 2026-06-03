"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems, votes, voteOptions, chatMessages, profiles } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { geocode } from "@/lib/geocode";

export interface PlannedActivity {
  day: number;
  title: string;
  type: "activity" | "accommodation" | "transport" | "meal";
  startTime?: string;
  locationName?: string;
  costEstimate?: number;
  notes?: string;
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
  // Accept H:MM, HH:MM, HH:MM:SS
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

  // Geocode each item's locationName so it shows up as a pin on the trip
  // map. Without this, AI-planned items only appear in the list — the map
  // looks empty and the two views feel disconnected. Best-effort: failures
  // leave coords null so the item still saves. Falls back to using the
  // title when the model didn't emit a locationName. Nominatim tolerates
  // small parallel bursts for user-triggered actions.
  const geos = await Promise.all(
    items.map((a) => {
      const query = (a.locationName || a.title || "").trim();
      if (!query) return Promise.resolve(null);
      return geocode(query, trip.destination ?? undefined).catch(() => null);
    }),
  );

  const rows = items.map((a, idx) => ({
    tripId,
    dayDate: addDays(trip.startDate as string, a.day - 1),
    title: a.title,
    type: sanitizeType(a.type),
    startTime: sanitizeTime(a.startTime), // AI returns "morning"/"evening" which breaks TIME columns
    locationName: a.locationName ?? null,
    locationLat: geos[idx]?.lat ?? null,
    locationLng: geos[idx]?.lng ?? null,
    costEstimate: a.costEstimate ?? null,
    notes: a.notes ?? null,
    status: "proposed" as const,
    sortOrder: idx,
    createdBy: user.id,
  }));

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
    },
  });

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);

  return { voteId: vote.id };
}
