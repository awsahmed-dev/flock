// B6: merged Docs + Packing into a single "Pack" tab.
// Data is slow-changing, so 30s revalidate; mutations call revalidatePath.
export const revalidate = 30;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { documents, packingItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { PackBoard } from "@/components/pack/pack-board";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function PackRoute({ params, searchParams }: Props) {
  const { id } = await params;
  const { view } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner",
  );

  // Parallel load both sub-tabs so switching is instant.
  const [docs, items] = await Promise.all([
    db.query.documents.findMany({
      where: eq(documents.tripId, id),
      with: { uploader: true },
      orderBy: [asc(documents.createdAt)],
    }),
    db.query.packingItems.findMany({
      where: eq(packingItems.tripId, id),
      orderBy: [asc(packingItems.category), asc(packingItems.createdAt)],
    }),
  ]);

  return (
    <PackBoard
      tripId={id}
      userId={user.id}
      isOwner={isOwner}
      // Validate the URL ?view= against our known set so a typo doesn't
      // crash the segmented control. When the user hasn't picked a sub-
      // view, default to the side that has content — packing has the
      // auto-seeded 20-item list on every new trip, so showing the empty
      // Docs grid first hides the more useful view.
      initialView={
        view === "packing"
          ? "packing"
          : view === "docs"
            ? "docs"
            : docs.length === 0 && items.length > 0
              ? "packing"
              : "docs"
      }
      documents={docs as any}
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
        displayName: m.displayName,
        avatarUrl: m.user?.avatarUrl ?? null,
      }))}
    />
  );
}
