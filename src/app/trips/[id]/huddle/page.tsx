export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { huddleDecisions, activities, packingItems , documents } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { tripPhase } from "@/lib/trip-phase";
import { expireStaleDecisions } from "@/lib/actions/huddle";
import { HuddleBoard } from "@/components/huddle/huddle-board";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ compose?: string; tab?: string }>;
}

/**
 * Phase 6 §4 — Huddle: where the group's decisions and momentum live.
 * Decision Deck ("NEEDS YOU") on top, Pulse feed below. No text composer
 * anywhere — the only way to post is to DO something.
 */
export default async function HuddlePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { compose, tab } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  await expireStaleDecisions(id);

  // Sprint 6 FIX-1: documents live in Huddle now (Docs segment).
  const tripDocs = await db.query.documents.findMany({
    where: eq(documents.tripId, id),
    with: { uploader: true },
  });

  const decisions = await db.query.huddleDecisions.findMany({
    where: and(eq(huddleDecisions.tripId, id), eq(huddleDecisions.status, "open")),
    with: { reactions: { with: { user: true } } },
    orderBy: [desc(huddleDecisions.createdAt)],
  });

  const pulse = await db.query.activities.findMany({
    where: eq(activities.tripId, id),
    with: { actor: true },
    orderBy: [desc(activities.createdAt)],
    limit: 100,
  });

  // Phase 7 §7-A: packing status for the Prep row (PLANNING/DEPARTURE only).
  const packRows = await db
    .select({ packed: packingItems.packed })
    .from(packingItems)
    .where(eq(packingItems.tripId, id));
  const packing = { packed: packRows.filter((r) => r.packed).length, total: packRows.length };
  const phase = tripPhase({ startDate: trip.startDate, endDate: trip.endDate });

  const crew = trip.members.map((m) => ({
    userId: m.userId,
    displayName: m.user?.displayName || m.displayName,
    avatarUrl: m.user?.avatarUrl ?? null,
  }));

  return (
    <HuddleBoard
      tripId={id}
      tripName={trip.name}
      currency={trip.currency}
      currentUserId={user.id}
      crew={crew}
      openCompose={compose === "poll"}
      initialTab={tab === "docs" ? "docs" : "decisions"}
      documents={tripDocs.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        url: d.url,
        dayDate: d.dayDate,
        uploaderName: d.uploader?.displayName ?? null,
      }))}
      packing={packing}
      showPrepRow={phase === "PLANNING" || phase === "DEPARTURE"}
      decisions={decisions.map((d) => ({
        id: d.id,
        type: d.type,
        placeId: d.placeId,
        placeName: d.placeName,
        placePhotoUrl: d.placePhotoUrl,
        placeRating: d.placeRating != null ? Number(d.placeRating) : null,
        placeCategory: d.placeCategory,
        placeNeighborhood: d.placeNeighborhood,
        suggestedDay: d.suggestedDay,
        pollQuestion: d.pollQuestion,
        pollOptions: (d.pollOptions as { id: string; label: string; voterIds: string[] }[] | null) ?? null,
        createdByName: crew.find((m) => m.userId === d.createdBy)?.displayName ?? "Someone",
        reactions: d.reactions.map((r) => ({
          reaction: r.reaction,
          userId: r.userId ?? "",
          name: r.user?.displayName ?? "Someone",
          avatarUrl: r.user?.avatarUrl ?? null,
        })),
      }))}
      pulse={pulse.map((a) => ({
        id: a.id,
        eventType: a.eventType,
        actorName: a.actor?.displayName ?? "Paxawa",
        actorAvatar: a.actor?.avatarUrl ?? null,
        placeName: a.placeName,
        placePhotoUrl: a.placePhotoUrl,
        amount: a.amount != null ? Number(a.amount) : null,
        amountBase: a.amountBase != null ? Number(a.amountBase) : null,
        currency: a.currency,
        isSystem: a.isSystem ?? false,
        metadata: (a.metadata ?? {}) as Record<string, unknown>,
        createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
      }))}
    />
  );
}
