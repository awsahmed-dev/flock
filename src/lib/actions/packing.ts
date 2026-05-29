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

/**
 * One-tap suggested-list bootstrapper. Adds a curated set of "every trip
 * needs these" items in a single insert. Skips duplicates by label so it's
 * safe to call twice. Drops items into "shared" scope.
 */
export async function seedSuggestedPacking(formData: FormData) {
  const user = await authed();
  const tripId = formData.get("tripId") as string;
  if (!tripId) throw new Error("Missing tripId");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found or access denied");

  await ensureProfile(user);

  // B6: smarter defaults — generic essentials + destination-aware additions
  // (beach trips get sunglasses & sandals, ski trips get gloves, etc).
  const baseSuggestions: Array<{ label: string; category: string }> = [
    // Docs
    { label: "Passport", category: "docs" },
    { label: "Travel insurance card", category: "docs" },
    { label: "Boarding passes / tickets", category: "docs" },
    // Tech
    { label: "Phone charger", category: "tech" },
    { label: "Power bank", category: "tech" },
    { label: "Adapter / plug converter", category: "tech" },
    { label: "Headphones", category: "tech" },
    // Toiletries
    { label: "Toothbrush", category: "toiletries" },
    { label: "Toothpaste", category: "toiletries" },
    { label: "Deodorant", category: "toiletries" },
    { label: "Sunscreen", category: "toiletries" },
    // Medical
    { label: "First-aid kit", category: "medical" },
    { label: "Painkillers", category: "medical" },
    // Clothing essentials
    { label: "Underwear (one per day)", category: "clothing" },
    { label: "Socks (one per day)", category: "clothing" },
    { label: "Comfortable walking shoes", category: "clothing" },
    // General
    { label: "Reusable water bottle", category: "general" },
    { label: "Day bag / backpack", category: "general" },
  ];

  // Destination-aware add-ons
  const dest = trip.destination?.toLowerCase() ?? "";
  const extras: Array<{ label: string; category: string }> = [];
  if (/(beach|bali|maldives|hawaii|cancun|phuket|santorini)/.test(dest)) {
    extras.push(
      { label: "Swimsuit", category: "clothing" },
      { label: "Sandals / flip-flops", category: "clothing" },
      { label: "Sunglasses", category: "clothing" },
      { label: "Beach towel", category: "general" },
      { label: "After-sun lotion", category: "toiletries" },
    );
  }
  if (/(ski|snow|alps|aspen|whistler|hokkaido)/.test(dest)) {
    extras.push(
      { label: "Ski gloves", category: "clothing" },
      { label: "Thermal base layers", category: "clothing" },
      { label: "Wool socks", category: "clothing" },
      { label: "Lip balm with SPF", category: "toiletries" },
    );
  }
  if (/(hike|trek|mountain|patagonia|kilimanjaro|nepal|himalaya)/.test(dest)) {
    extras.push(
      { label: "Hiking boots", category: "clothing" },
      { label: "Rain jacket", category: "clothing" },
      { label: "Headlamp", category: "tech" },
      { label: "Blister kit", category: "medical" },
    );
  }
  if (/(japan|korea|taiwan|thailand|vietnam|indonesia|china|hong kong|singapore|asia)/.test(dest)) {
    extras.push(
      { label: "Slip-on shoes (temple visits)", category: "clothing" },
      { label: "Pocket tissue / wet wipes", category: "general" },
    );
  }
  if (/(europe|paris|rome|barcelona|prague|london|berlin)/.test(dest)) {
    extras.push(
      { label: "Compact umbrella", category: "general" },
      { label: "Scarf / shawl", category: "clothing" },
    );
  }

  const suggestions = [...baseSuggestions, ...extras];

  // Find existing labels (case-insensitive) so we don't double-seed.
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
      createdBy: user.id,
    }));

  if (toInsert.length > 0) {
    await db.insert(packingItems).values(toInsert);
  }

  revalidatePath(`/trips/${tripId}/packing`);
  revalidatePath(`/trips/${tripId}/pack`);
}
