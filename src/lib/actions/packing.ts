"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { packingItems, profiles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTripWithMembership } from "./trips";

async function authed() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

async function ensureProfile(user: any) {
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName:
        user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
      email: user.email,
    })
    .onConflictDoNothing();
}

/**
 * Create a packing item. Scope is controlled by `scope`:
 * - "shared" → user_id NULL (visible/checkable by everyone)
 * - "mine"   → user_id = current user (personal checklist)
 *
 * Categories are free-form text (general / clothes / docs / tech / toiletries
 * / medical / outdoor / other) — kept as text so the user can rename them
 * later without a migration.
 */
export async function createPackingItem(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  const label = (formData.get("label") as string)?.trim();
  const category = ((formData.get("category") as string) || "general").trim();
  const scope = (formData.get("scope") as string) || "shared"; // "shared" | "mine"
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!tripId || !label) throw new Error("Label is required");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await ensureProfile(user);

  await db.insert(packingItems).values({
    tripId,
    userId: scope === "mine" ? user.id : null,
    label,
    category: category || "general",
    notes,
    createdBy: user.id,
  });

  revalidatePath(`/trips/${tripId}/packing`);
  revalidatePath(`/trips/${tripId}/pack`);
  revalidatePath(`/trips/${tripId}`);
}

/**
 * Toggle the `packed` flag. Shared items can be toggled by anyone in the
 * trip; personal items only by the owner (or trip owner). RLS enforces this
 * on the DB side too, so a forged client can't sneak past.
 */
export async function togglePackingItem(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  const itemId = formData.get("itemId") as string;

  if (!tripId || !itemId) throw new Error("Missing parameters");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const item = await db.query.packingItems.findFirst({
    where: and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)),
  });
  if (!item) throw new Error("Item not found");

  // Authorization: shared item OR owned-by-me OR trip-owner.
  const isTripOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner",
  );
  if (item.userId !== null && item.userId !== user.id && !isTripOwner) {
    throw new Error("Not your item");
  }

  await db
    .update(packingItems)
    .set({ packed: !item.packed, updatedAt: new Date() })
    .where(eq(packingItems.id, itemId));

  revalidatePath(`/trips/${tripId}/packing`);
  revalidatePath(`/trips/${tripId}/pack`);
}

export async function deletePackingItem(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  const itemId = formData.get("itemId") as string;

  if (!tripId || !itemId) throw new Error("Missing parameters");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  const item = await db.query.packingItems.findFirst({
    where: and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)),
  });
  if (!item) throw new Error("Item not found");

  const isTripOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner",
  );
  if (
    item.createdBy !== user.id &&
    item.userId !== user.id &&
    !isTripOwner
  ) {
    throw new Error("Not authorized");
  }

  await db.delete(packingItems).where(eq(packingItems.id, itemId));

  revalidatePath(`/trips/${tripId}/packing`);
  revalidatePath(`/trips/${tripId}/pack`);
}

import { buildPackingSuggestions } from "@/lib/packing-suggestions";

/**
 * Local fallback so anything that still imports buildPackingSuggestions
 * from this module continues to resolve. The real implementation now
 * lives in src/lib/packing-suggestions.ts (pure data, no "use server").
 */
/**
 * B12: server entry — accepts a trip + the suggestion list, inserts
 * any that don't already exist (idempotent by lowercased label).
 * Shared between seedSuggestedPacking() (user-triggered) and
 * createTrip() (auto-seed on trip create).
 */
async function insertSuggestions(
  tripId: string,
  userId: string,
  suggestions: Array<{ label: string; category: string }>,
) {
  const existing = await db
    .select({ label: packingItems.label })
    .from(packingItems)
    .where(eq(packingItems.tripId, tripId));
  const have = new Set(existing.map((e) => e.label.toLowerCase()));

  const toInsert = suggestions
    .filter((s) => !have.has(s.label.toLowerCase()))
    .map((s) => ({
      tripId,
      userId: null,
      label: s.label,
      category: s.category,
      createdBy: userId,
    }));

  if (toInsert.length > 0) {
    await db.insert(packingItems).values(toInsert);
  }
}

/**
 * User-triggered "Start with suggestions" — same payload as the auto-
 * seed during trip creation, but invoked from the Pack tab when the
 * user clicks the suggestion CTA.
 */
export async function seedSuggestedPacking(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  if (!tripId) throw new Error("Missing tripId");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await ensureProfile(user);
  await insertSuggestions(tripId, user.id, buildPackingSuggestions(trip.destination));

  revalidatePath(`/trips/${tripId}/packing`);
  revalidatePath(`/trips/${tripId}/pack`);
}

/**
 * B12: auto-seed entry point called by createTrip(). Same insertion
 * logic, but takes the destination directly since the trip is brand-new
 * and not yet readable via getTripWithMembership.
 */
export async function autoSeedPackingForNewTrip(
  tripId: string,
  userId: string,
  destination: string,
) {
  await insertSuggestions(tripId, userId, buildPackingSuggestions(destination));
}
