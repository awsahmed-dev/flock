// B6: merged Docs + Packing into a single "Pack" tab.
// Data is slow-changing, so 30s revalidate; mutations call revalidatePath.
export const revalidate = 30;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { packingItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { PackBoard } from "@/components/pack/pack-board";
import { BackButton } from "@/components/navigation/back-button";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function PackRoute({ params, searchParams }: Props) {
  const { id } = await params;
  await searchParams; // view param retired (Sprint 6: docs live in Huddle)
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner",
  );

  // Sprint 6 FIX-1: documents moved to Huddle's Docs segment — Pack loads
  // packing only.
  const items = await db.query.packingItems.findMany({
    where: eq(packingItems.tripId, id),
    orderBy: [asc(packingItems.category), asc(packingItems.createdAt)],
  });

  return (
    <>
      {/* Phase 7 §7-C: smart back — pops to wherever the user came from
          (usually the Huddle prep row); cold-load fallback is the trip root. */}
      <div className="px-2 pt-2">
        <BackButton
          fallback={`/trips/${id}`}
          className="flex items-center gap-1 h-11 px-2 text-[13px] font-semibold text-muted-foreground"
        />
      </div>
      <PackBoard
      tripId={id}
      userId={user.id}
      isOwner={isOwner}
      packing={items.map((i) => ({
        id: i.id,
        label: i.label,
        category: i.category,
        packed: i.packed,
        notes: i.notes,
        userId: i.userId,
        createdBy: i.createdBy,
      }))}
      members={trip.members.map((m) => ({
        userId: m.userId,
        // §10.3: live profile name over the join-time cached copy.
        displayName: m.user?.displayName || m.displayName,
        avatarUrl: m.user?.avatarUrl ?? null,
      }))}
    />
    </>
  );
}
