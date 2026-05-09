"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { votes, voteOptions, chatMessages } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface HotelSuggestion {
  name: string;
  address?: string;
  rating?: number;
  priceLevel?: number;
  photoUrl?: string;
  mapsUrl?: string;
  bookingUrl?: string;
}

// ─── Suggest a single hotel → creates vote + chat link card ──────────────────

export async function suggestHotel(
  tripId: string,
  hotel: HotelSuggestion,
  destination: string
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found");

  const question = `Should we stay at ${hotel.name}?`;

  // Create vote
  const [vote] = await db
    .insert(votes)
    .values({ tripId, question, createdBy: user.id })
    .returning();

  await db.insert(voteOptions).values([
    { voteId: vote.id, label: `Yes — book ${hotel.name}`, sortOrder: 0 },
    { voteId: vote.id, label: "No, let's look at other options", sortOrder: 1 },
  ]);

  // Post link card with rich hotel preview in chat
  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    type: "link_card",
    body: null,
    metadata: {
      url: hotel.bookingUrl ?? hotel.mapsUrl ?? "",
      siteType: "hotel",
      siteName: hotel.name,
      photoUrl: hotel.photoUrl,
      rating: hotel.rating,
      priceLevel: hotel.priceLevel,
      address: hotel.address,
      destination,
      confirmedAction: "vote",
      linkedId: vote.id,
    },
  });

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);

  return { voteId: vote.id };
}

// ─── Compare multiple hotels in a single vote ─────────────────────────────────

export async function suggestMultipleHotels(
  tripId: string,
  hotels: HotelSuggestion[]
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(tripId, user.id);
  if (!trip) throw new Error("Trip not found");

  if (hotels.length < 2) throw new Error("Need at least 2 hotels to compare");

  const question = `Where should we stay in ${trip.destination}?`;

  const [vote] = await db
    .insert(votes)
    .values({ tripId, question, createdBy: user.id })
    .returning();

  await db.insert(voteOptions).values(
    hotels.map((h, i) => ({
      voteId: vote.id,
      label: h.name,
      sortOrder: i,
    }))
  );

  // Post a vote card with all hotels as options
  await db.insert(chatMessages).values({
    tripId,
    userId: user.id,
    type: "vote_card",
    body: null,
    metadata: {
      question,
      options: hotels.map((h) => h.name),
      voteId: vote.id,
      source: "hotel_search",
      hotelDetails: hotels.map((h) => ({
        name: h.name,
        photoUrl: h.photoUrl,
        rating: h.rating,
        priceLevel: h.priceLevel,
      })),
    },
  });

  revalidatePath(`/trips/${tripId}/chat`);
  revalidatePath(`/trips/${tripId}/votes`);

  return { voteId: vote.id };
}
