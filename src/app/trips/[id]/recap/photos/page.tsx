export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems, tripPhotos } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { PhotosGrid } from "@/components/trips/cockpit/photos-grid";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §3-E panel 4 — the full photo grid behind the Wrap. */
export default async function RecapPhotosPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const rows = await db
    .select({
      id: itineraryItems.id,
      title: itineraryItems.title,
      dayDate: itineraryItems.dayDate,
      photoUrl: itineraryItems.photoUrl,
    })
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.dayDate), asc(itineraryItems.sortOrder));

  const photos = rows.filter((r) => r.photoUrl != null) as {
    id: string;
    title: string;
    dayDate: string;
    photoUrl: string;
  }[];

  // Sprint 8 Item 6: crew photos dropped on stops in the RECAP sheet join
  // the Wrap grid, labeled with their stop's title when pinned to one.
  const crewShots = await db
    .select({
      id: tripPhotos.id,
      url: tripPhotos.url,
      itemId: tripPhotos.itemId,
      createdAt: tripPhotos.createdAt,
    })
    .from(tripPhotos)
    .where(eq(tripPhotos.tripId, id))
    .orderBy(desc(tripPhotos.createdAt));
  const titleByItem = new Map(rows.map((r) => [r.id, { title: r.title, dayDate: r.dayDate }]));
  const crewPhotos = crewShots.map((p) => {
    const stop = p.itemId ? titleByItem.get(p.itemId) : undefined;
    return {
      id: p.id,
      title: stop?.title ?? trip.name,
      dayDate: stop?.dayDate ?? "",
      photoUrl: p.url,
    };
  });

  return <PhotosGrid tripId={id} tripName={trip.name} photos={[...crewPhotos, ...photos]} />;
}
