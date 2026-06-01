"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { buildPackingSuggestions } from "@/lib/packing-suggestions";
import { trips, tripMembers, tripInvites, profiles, packingItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

export async function createTrip(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const name = formData.get("name") as string;
  const destination = formData.get("destination") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const budgetTotal = formData.get("budgetTotal")
    ? parseFloat(formData.get("budgetTotal") as string)
    : null;
  const currency = (formData.get("currency") as string) || "USD";

  if (!name || !destination || !startDate || !endDate) {
    throw new Error("Missing required fields");
  }

  // Ensure profile exists
  await db
    .insert(profiles)
    .values({
      id: user.id,
      displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url,
    })
    .onConflictDoNothing();

  const [trip] = await db
    .insert(trips)
    .values({
      name,
      destination,
      startDate,
      endDate,
      budgetTotal,
      currency,
      createdBy: user.id,
    })
    .returning();

  // Add creator as owner member
  await db.insert(tripMembers).values({
    tripId: trip.id,
    userId: user.id,
    displayName:
      user.user_metadata?.display_name || user.email?.split("@")[0] || "Traveler",
    role: "owner",
  });

  // Create a permanent invite token
  const token = randomBytes(16).toString("hex");
  await db.insert(tripInvites).values({
    tripId: trip.id,
    token,
    createdBy: user.id,
  });

  // B12: auto-seed packing list with destination-aware suggestions so
  // the user lands on a populated checklist instead of an empty state.
  // Pure local insert (no auth dance) — we already verified the user.
  const suggestions = buildPackingSuggestions(destination);
  if (suggestions.length > 0) {
    await db.insert(packingItems).values(
      suggestions.map((s) => ({
        tripId: trip.id,
        userId: null,
        label: s.label,
        category: s.category,
        createdBy: user.id,
      })),
    );
  }

  redirect(`/trips/${trip.id}`);
}

export async function getTripWithMembership(tripId: string, userId: string) {
  const trip = await db.query.trips.findFirst({
    where: eq(trips.id, tripId),
    with: {
      members: { with: { user: true } },
      invites: true,
    },
  });

  if (!trip) return null;

  const isMember = trip.members.some((m) => m.userId === userId);
  if (!isMember) return null;

  return trip;
}
