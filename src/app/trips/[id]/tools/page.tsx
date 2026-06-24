export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import {
  itineraryItems,
  packingItems,
  documents,
  decisions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isOwner as checkOwner } from "@/lib/permissions";
import { ToolsHub, type ToolsHubStats } from "@/components/trips/tools-hub";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * The Tools hub page — foyer to every secondary trip surface. Pre-computes
 * one live stat per tile in a single parallel batch (mirrors the Overview
 * action hub; all single-table scans on indexed trip_id) so each tile is a
 * status glance, not just a menu.
 */
export default async function ToolsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const [itinRows, packingRows, docRows, decisionRows] = await Promise.all([
    db.query.itineraryItems.findMany({
      where: eq(itineraryItems.tripId, id),
      columns: { type: true },
    }),
    db.query.packingItems.findMany({
      where: eq(packingItems.tripId, id),
      columns: { packed: true },
    }),
    db.query.documents.findMany({
      where: eq(documents.tripId, id),
      columns: { id: true },
    }),
    db.query.decisions.findMany({
      where: eq(decisions.tripId, id),
      columns: { status: true, votes: true },
    }),
  ]);

  const decisionsNeedingVote = decisionRows.filter((d) => {
    if (d.status !== "open") return false;
    const v = (d.votes ?? {}) as Record<string, unknown>;
    return !v[user.id];
  }).length;

  const stats: ToolsHubStats = {
    // Bookings tracks the gaps you still need to book — accommodation +
    // transport are the bookable item types.
    bookablesCount: itinRows.filter(
      (i) => i.type === "accommodation" || i.type === "transport",
    ).length,
    packingPacked: packingRows.filter((p) => p.packed).length,
    packingTotal: packingRows.length,
    documentsCount: docRows.length,
    memberCount: trip.members.length,
    decisionsNeedingVote,
  };

  return (
    <ToolsHub
      tripId={id}
      isOwner={checkOwner(trip, user.id)}
      shareToken={trip.shareToken ?? null}
      stats={stats}
    />
  );
}
